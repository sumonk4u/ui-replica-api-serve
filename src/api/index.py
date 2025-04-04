
"""
FastAPI backend for RAG system with SSO authentication.
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from fastapi import FastAPI, HTTPException, Depends, Request, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordBearer
import requests
from jose import jwt, JWTError
import numpy as np

# These will only be imported if available in the Python environment
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    from azure.storage.filedatalake import DataLakeServiceClient
except ImportError:
    print("WARNING: Some dependencies are missing. Please install requirements.txt")

from config import (
    PING_FEDERATE, ADLS_CONFIG, VECTOR_DB_CONFIG, 
    LLM_CONFIG, EMBEDDING_CONFIG, SECRET_KEY, 
    ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# In-memory storage for document embeddings (replace with actual vector DB in production)
document_store = {
    "documents": [],
    "embeddings": []
}

# Initialize embedding model (lazily loaded when needed)
embedding_model = None

def get_embedding_model():
    """Lazily initialize the embedding model."""
    global embedding_model
    if embedding_model is None:
        try:
            embedding_model = SentenceTransformer(EMBEDDING_CONFIG["model_name"])
        except Exception as e:
            print(f"Error loading embedding model: {e}")
            raise HTTPException(
                status_code=500, 
                detail="Embedding model could not be loaded. Please check installation."
            )
    return embedding_model

# Authentication functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate the access token and return the current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return {"username": username}
    except JWTError:
        raise credentials_exception

# Routes for health check and basic API functionality
@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# SSO Authentication endpoints
@app.get("/api/auth/login")
async def login():
    """Initiate the SSO login flow by redirecting to PingFederate."""
    auth_url = (
        f"{PING_FEDERATE['authorization_endpoint']}"
        f"?client_id={PING_FEDERATE['client_id']}"
        f"&response_type=code"
        f"&redirect_uri={PING_FEDERATE['redirect_uri']}"
        f"&scope=openid profile email"
    )
    return RedirectResponse(url=auth_url)

@app.post("/api/auth/token")
async def get_token(code: str = Body(...)):
    """Exchange authorization code for access token."""
    try:
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": PING_FEDERATE["redirect_uri"],
            "client_id": PING_FEDERATE["client_id"],
            "client_secret": PING_FEDERATE["client_secret"],
        }
        
        response = requests.post(
            PING_FEDERATE["token_endpoint"],
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Token exchange failed: {response.text}"
            )
            
        token_info = response.json()
        
        # Get user info from PingFederate
        user_response = requests.get(
            PING_FEDERATE["userinfo_endpoint"],
            headers={"Authorization": f"Bearer {token_info['access_token']}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=user_response.status_code,
                detail=f"Failed to get user info: {user_response.text}"
            )
            
        user_info = user_response.json()
        
        # Create our own JWT token
        access_token = create_access_token(
            data={"sub": user_info.get("email", user_info.get("preferred_username"))},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "username": user_info.get("preferred_username")
            }
        }
    except Exception as e:
        print(f"Error in token exchange: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token exchange error: {str(e)}"
        )

@app.get("/api/auth/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get information about the currently authenticated user."""
    return current_user

# Document processing and RAG functionality
async def load_documents_from_adls():
    """Load markdown documents from Azure Data Lake Storage."""
    try:
        # Initialize the DataLakeServiceClient
        service_client = DataLakeServiceClient.from_connection_string(
            ADLS_CONFIG["connection_string"]
        )
        
        # Get a client to interact with a specific container
        file_system_client = service_client.get_file_system_client(
            file_system=ADLS_CONFIG["container_name"]
        )
        
        # Get a client to interact with a specific directory
        directory_client = file_system_client.get_directory_client(
            ADLS_CONFIG["directory_path"]
        )
        
        # List all files in the directory
        paths = list(directory_client.get_paths(recursive=True))
        
        documents = []
        
        # Process each file that ends with .md
        for path in paths:
            if path.name.endswith(".md"):
                file_client = file_system_client.get_file_client(path.name)
                
                # Download the file
                download = file_client.download_file()
                content = download.readall().decode("utf-8")
                
                # Simple chunking strategy - could be more sophisticated
                chunks = chunk_text(content)
                
                for i, chunk in enumerate(chunks):
                    documents.append({
                        "id": f"{path.name}_{i}",
                        "source": path.name,
                        "content": chunk,
                        "metadata": {
                            "source_file": path.name,
                            "chunk_index": i
                        }
                    })
        
        return documents
    except Exception as e:
        print(f"Error loading documents from ADLS: {str(e)}")
        return []

def chunk_text(text, chunk_size=1000, overlap=100):
    """Split text into chunks with overlap."""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        
        # Try to find a sensible break point like a newline or period
        if end < len(text):
            # Look for the last newline in the chunk
            last_newline = text.rfind('\n', start, end)
            if last_newline > start + chunk_size // 2:  # Must be in the second half of the chunk
                end = last_newline + 1
            else:
                # Look for the last period in the chunk
                last_period = text.rfind('.', start, end)
                if last_period > start + chunk_size // 2:  # Must be in the second half of the chunk
                    end = last_period + 1
        
        chunks.append(text[start:end])
        start = end - overlap  # Overlap with previous chunk
    
    return chunks

async def create_document_embeddings():
    """Create embeddings for all documents in the collection."""
    model = get_embedding_model()
    documents = await load_documents_from_adls()
    
    if not documents:
        return {"status": "error", "message": "No documents found in ADLS"}
    
    # Create embeddings for all documents
    texts = [doc["content"] for doc in documents]
    try:
        embeddings = model.encode(texts)
        
        # Store documents and embeddings
        document_store["documents"] = documents
        document_store["embeddings"] = embeddings
        
        return {
            "status": "success", 
            "message": f"Created embeddings for {len(documents)} document chunks"
        }
    except Exception as e:
        print(f"Error creating embeddings: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/documents/process")
async def process_documents(current_user = Depends(get_current_user)):
    """Process documents from ADLS and create embeddings."""
    result = await create_document_embeddings()
    return result

@app.get("/api/documents/count")
async def get_document_count(current_user = Depends(get_current_user)):
    """Get the count of document chunks in the store."""
    return {"count": len(document_store["documents"])}

def search_documents(query: str, top_k: int = 5):
    """Search for documents similar to the query."""
    if not document_store["documents"]:
        return []
    
    model = get_embedding_model()
    query_embedding = model.encode([query])[0]
    
    # Convert to numpy arrays for similarity calculation
    query_embedding_np = np.array(query_embedding).reshape(1, -1)
    doc_embeddings_np = np.array(document_store["embeddings"])
    
    # Calculate similarity scores
    similarities = cosine_similarity(query_embedding_np, doc_embeddings_np)[0]
    
    # Get indices of top k results
    top_indices = similarities.argsort()[-top_k:][::-1]
    
    # Return results with similarity scores
    results = []
    for idx in top_indices:
        results.append({
            "document": document_store["documents"][idx],
            "similarity": float(similarities[idx])
        })
    
    return results

@app.post("/api/search")
async def search(
    query: str = Body(...), 
    top_k: int = Body(5),
    current_user = Depends(get_current_user)
):
    """Search for documents similar to the query."""
    if not document_store["documents"]:
        return {"results": [], "message": "Document store is empty. Please process documents first."}
    
    try:
        results = search_documents(query, top_k)
        return {"results": results}
    except Exception as e:
        print(f"Error in search: {str(e)}")
        return {"results": [], "error": str(e)}

async def query_llm(system_prompt: str, user_message: str, context: str):
    """Query the LLM with system prompt, user message, and context."""
    provider = LLM_CONFIG["provider"]
    
    if provider == "azure_openai":
        try:
            headers = {
                "Content-Type": "application/json",
                "api-key": LLM_CONFIG["api_key"],
            }
            
            payload = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_message}"}
                ],
                "model": LLM_CONFIG["model"],
                "temperature": 0.7,
                "max_tokens": 800
            }
            
            response = requests.post(
                f"{LLM_CONFIG['api_base']}/openai/deployments/{LLM_CONFIG['model']}/chat/completions?api-version={LLM_CONFIG['api_version']}",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                print(f"LLM API error: {response.text}")
                return "Sorry, I couldn't process your request at this time."
            
            response_data = response.json()
            return response_data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error calling LLM API: {str(e)}")
            return f"Error calling language model: {str(e)}"
    else:
        # Add other LLM providers as needed
        return "This LLM provider is not implemented yet."

@app.post("/api/chat")
async def chat(
    message: str = Body(...),
    current_user = Depends(get_current_user)
):
    """Process a chat message using RAG."""
    # First, search for relevant documents
    try:
        search_results = search_documents(message, top_k=3)
        
        if not search_results:
            return {"response": "I don't have enough context to answer that question effectively. Try processing some documents first."}
        
        # Create context from search results
        context = "\n\n".join([
            f"Document {i+1} (Source: {result['document']['source']}):\n{result['document']['content']}"
            for i, result in enumerate(search_results)
        ])
        
        # Define system prompt
        system_prompt = """
        You are a helpful assistant that answers questions based on the provided context.
        If the context doesn't contain enough information to answer the question confidently, 
        acknowledge this limitation and suggest what additional information might be needed.
        Always cite your sources when providing information from the context.
        """
        
        # Query the LLM
        response = await query_llm(system_prompt, message, context)
        
        return {"response": response}
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return {"response": f"An error occurred: {str(e)}"}

# Run this file directly for testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)
