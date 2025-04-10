// API configuration
// Since we're only using development environments, we can set a more appropriate configuration
// for the Azure Web App development environment

// For local development, use your local FastAPI server
const LOCAL_API_URL = 'http://localhost:3000';

// For Azure Web App development environment
const AZURE_API_URL = '/api'; 

// Determine if running on Azure Web App (you can customize this check based on your environment)
const isAzureEnvironment = window.location.hostname.includes('azurewebsites.net');

export const API_BASE_URL = isAzureEnvironment ? AZURE_API_URL : LOCAL_API_URL;

// Other global configuration variables can be added here
