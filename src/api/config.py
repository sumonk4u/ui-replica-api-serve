
"""
Configuration for the FastAPI backend, including SSO and RAG system settings.
"""

# PingFederate SSO Configuration
# Replace these values with your actual PingFederate configuration
PING_FEDERATE = {
    "issuer": "https://your-pingfederate-domain.com",  # REPLACE: Your PingFederate issuer URL
    "client_id": "your-client-id",  # REPLACE: Your client ID
    "client_secret": "your-client-secret",  # REPLACE: Your client secret
    "redirect_uri": "http://localhost:8080/auth/callback",  # Frontend callback URL
    "authorization_endpoint": "https://your-pingfederate-domain.com/as/authorization.oauth2",  # REPLACE: Auth endpoint
    "token_endpoint": "https://your-pingfederate-domain.com/as/token.oauth2",  # REPLACE: Token endpoint
    "userinfo_endpoint": "https://your-pingfederate-domain.com/idp/userinfo.openid",  # REPLACE: UserInfo endpoint
    "jwks_uri": "https://your-pingfederate-domain.com/pf/JWKS",  # REPLACE: JWKS URI for verifying tokens
}

# Azure Data Lake Storage Configuration
# Replace these values with your actual ADLS configuration
ADLS_CONFIG = {
    "account_name": "your-adls-account",  # REPLACE: Your ADLS account name
    "container_name": "your-container",  # REPLACE: Your container name
    "directory_path": "documents/",  # REPLACE: Path to your markdown files
    "connection_string": "DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key;EndpointSuffix=core.windows.net",  # REPLACE: Your connection string
}

# Vector Database Configuration
# This example uses in-memory vectors, replace with your actual vector DB configuration if needed
VECTOR_DB_CONFIG = {
    "type": "in_memory",  # Options: "in_memory", "pinecone", "qdrant", etc.
    # If using Pinecone, uncomment and fill these:
    # "api_key": "your-pinecone-api-key",  # REPLACE: Your Pinecone API key
    # "environment": "your-pinecone-env",  # REPLACE: Your Pinecone environment
    # "index_name": "your-pinecone-index",  # REPLACE: Your Pinecone index name
}

# LLM Configuration
# Replace these values with your actual LLM configuration
LLM_CONFIG = {
    "provider": "azure_openai",  # Options: "azure_openai", "openai", "huggingface", etc.
    "model": "gpt-4",  # REPLACE: Your model name
    "api_key": "your-api-key",  # REPLACE: Your API key
    "api_base": "https://your-endpoint.openai.azure.com/",  # REPLACE: Your API base URL (for Azure)
    "api_version": "2023-05-15",  # REPLACE: Your API version (for Azure)
}

# Embedding Model Configuration
EMBEDDING_CONFIG = {
    "model_name": "all-MiniLM-L6-v2",  # Default SentenceTransformers model, or replace with your preferred model
    "dimension": 384,  # Dimension of the embeddings
}

# Security Configuration
SECRET_KEY = "your-secret-key-for-jwt-tokens"  # REPLACE: Generate a secure random key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
