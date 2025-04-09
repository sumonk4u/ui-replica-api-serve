
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.storage.blob import BlobServiceClient
import openai

# Initialize FastAPI
app = FastAPI()

# Configure CORS for production
origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    os.environ.get("WEBSITE_HOSTNAME", "*")  # Azure App Service hostname
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure Configuration
subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID", "abcdefgh-a164-0000-ccc4-97bf2c787ggg")
openai_account_name = os.environ.get("OPENAI_ACCOUNT_NAME", "a003-eastus2-1k-openai-000")
openai_api_version = os.environ.get("OPENAI_API_VERSION", "2024-10-01-21")
openai_chat_model = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-2024-05-13-tpm")

# Initialize Azure authentication - works both locally and in Azure
try:
    # Try Managed Identity first (for Azure deployment)
    credential = ManagedIdentityCredential()
    # Test the credential to see if it works
    credential.get_token("https://management.azure.com/.default")
except Exception:
    # Fall back to Default Azure Credential for local development
    credential = DefaultAzureCredential()

# Initialize OpenAI client
client = openai.AzureOpenAI(
    azure_endpoint=f"https://{openai_account_name}.openai.azure.com",
    api_version=openai_api_version,
    api_key=os.environ.get("OPENAI_API_KEY", ""),  # Will use MSI if empty
    azure_ad_token_provider=lambda: credential.get_token("https://cognitiveservices.azure.com/.default").token
)

# Define request models
class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000

@app.get("/")
def read_root():
    return {"message": "RAG System API"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API server is running"}

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        response = client.chat.completions.create(
            model=openai_chat_model,
            messages=[{"role": "user", "content": request.prompt}],
            max_tokens=request.max_tokens
        )
        
        return {"choices": [{"message": {"content": response.choices[0].message.content}}]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
