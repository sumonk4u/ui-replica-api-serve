
import os, subprocess, time
import requests
import httpx
import openai

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from azure.identity import ManagedIdentityCredential, get_bearer_token_provider
from azure.storage.blob import BlobServiceClient
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import SearchIndex, SimpleField
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Azure Configuration
subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID", "abcdefgh-a164-0000-ccc4-97bf2c787ggg")
client_id = os.environ.get("AZURE_CLIENT_ID", "b9a1jdsjd-643d-4590-accc-acdc200c5999")
object_id = os.environ.get("AZURE_OBJECT_ID", "2551abc-b2d6-bc12-8ccc-4c07219dae70")

# OpenAI Configuration
openai_resource_group_name = os.environ.get("OPENAI_RESOURCE_GROUP", "a003-eastus2-1k-openai-000")
openai_account_name = os.environ.get("OPENAI_ACCOUNT_NAME", "a003-eastus2-1k-openai-000")
openai_api_version = os.environ.get("OPENAI_API_VERSION", "2024-10-01-21")
openai_embedding_model = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
openai_chat_model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-2024-05-13-tpm")

# Authentication configuration - COMMENTED OUT FOR TESTING
# ping_federate_config = {
#     "issuer": os.environ.get("PING_ISSUER", "https://your-pingfederate-domain.com"),
#     "client_id": os.environ.get("PING_CLIENT_ID", "your-client-id"),
#     "client_secret": os.environ.get("PING_CLIENT_SECRET", "your-client-secret"),
#     "redirect_uri": os.environ.get("PING_REDIRECT_URI", "http://localhost:3000/auth/callback")
# }

# Azure Data Lake Storage Configuration
adls_config = {
    "account_name": os.environ.get("ADLS_ACCOUNT_NAME", "your-adls-account"),
    "container_name": os.environ.get("ADLS_CONTAINER_NAME", "documents")
}

# Initialize FastAPI
app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    os.environ.get("FRONTEND_URL", "*")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Azure authentication
msi = ManagedIdentityCredential(client_id=None if os.getenv("WEBSITE_INSTANCE_ID") else client_id)

# Initialize Cognitive Services client
cs = CognitiveServicesManagementClient(credential=msi, subscription_id=subscription_id)

# Initialize OpenAI client
token = get_bearer_token_provider(msi, "https://cognitiveservices.azure.com/.default")

client = openai.AsyncAzureOpenAI(
    azure_endpoint=f"https://{openai_account_name}.openai.azure.com",
    api_version=openai_api_version,
    azure_ad_token_provider=get_bearer_token_provider(msi, "https://cognitiveservices.azure.com/.default"),
)

# Define request models
class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 100

class DocumentRequest(BaseModel):
    content: str
    filename: str
    
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

# Define API endpoints
@app.get("/")
def read_root():
    return {"message": "RAG System API without SSO authentication (testing mode)"}

@app.post("/chat/")
async def chat(request: ChatRequest):
    print(f"request: {request.prompt}")
    
    try:
        # Generate API URL for chat completion
        api_url = f"https://{openai_account_name}.openai.azure.com/openai/deployments/{openai_chat_model}/chat/completions?api-version=2023-03-15-preview"
        print(f"apiUrl:: {api_url}")
        
        # Call Azure OpenAI
        response = await client.chat.completions.create(
            model=openai_chat_model,
            temperature=1,
            messages=[{"role": "user", "content": request.prompt}],
            stream=False
        )
        
        return response.json()
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/upload/")
async def upload_document(document: DocumentRequest):
    try:
        # Initialize blob client
        blob_service_client = BlobServiceClient(
            account_url=f"https://{adls_config['account_name']}.blob.core.windows.net",
            credential=msi
        )
        
        # Get container client
        container_client = blob_service_client.get_container_client(adls_config["container_name"])
        
        # Upload document
        blob_client = container_client.get_blob_client(document.filename)
        blob_client.upload_blob(document.content, overwrite=True)
        
        # Extract vectors and store in vector database
        # This is a simplified example - in a real system, you'd process the document
        # and store vectors in a vector database
        
        return {"message": "Document uploaded successfully", "filename": document.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/")
async def search_documents(search_request: SearchRequest):
    try:
        # This is a placeholder for actual search functionality
        # In a real implementation, you would:
        # 1. Generate embeddings for the query
        # 2. Search the vector database for similar documents
        # 3. Return the results
        
        return {"results": [f"Sample result for query: {search_request.query}"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Commented out SSO verification endpoint for testing
# @app.post("/auth/verify")
# async def verify_token(token_data: dict):
#     # Verify the authentication token from PingFederate
#     # This would involve validating the token with the PingFederate server
#     
#     return {"valid": True, "username": "sample_user"}

# Add a new health check endpoint for testing API connectivity
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "API server is running"}

# Run the application directly when the script is executed
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
