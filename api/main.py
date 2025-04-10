import asyncio
import os, subprocess, time
import pyodbc, redis
from azure.identity import ManagedIdentityCredential, DefaultAzureCredential, get_bearer_token_provider
from azure.storage.blob import BlobServiceClient
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from openai import AzureOpenAI
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import SearchIndex, SimpleField
from azure.search.documents import SearchClient
from pydantic import BaseModel
import requests
import httpx
import openai
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, UploadFile, File
from typing import List, Dict, Optional
import re
import json
from striptrtf.striptrtf import rtf_to_text
from fastapi.responses import JSONResponse

# Azure Configuration
subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID", "210da3-aff")
client_id = os.environ.get("CLIENT_ID", "7abbd-acdc17")
object_id = os.environ.get("OBJECT_ID", "644106-4d8a")
openai_resource_group_name, openai_account_name = os.environ.get("OPENAI_RESOURCE_GROUP", "nt03-eastus-km-openai-900"), os.environ.get("OPENAI_ACCOUNT_NAME", "nt03-eastus-km-openai-900")
openai_api_version, openai_embedding_model, openai_lang_model = os.environ.get("OPENAI_API_VERSION", "2024-10-21"), os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"), os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-2024-05-13-tpm")

search_service = "https://nt03-eastus-km-search-9893.search.windows.net"
search_index_name = "gptentern01index"

# Initialize FastAPI
app = FastAPI()

# Configure CORS for both development and production environments
origins = [
    "http://localhost:3000",  # Local development frontend
    "http://localhost:8080",  # Alternative local development port
    os.environ.get("WEBSITE_HOSTNAME", "*")  # Azure Web App hostname
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Azure authentication - works both locally and in Azure
try:
    # Try Managed Identity first (for Azure deployment)
    msi = ManagedIdentityCredential(client_id=None if os.getenv("WEBSITE_INSTANCE_ID") else client_id)
    # Test the credential to see if it works
    msi.get_token("https://management.azure.com/.default")
except Exception:
    # Fall back to Default Azure Credential for local development
    msi = DefaultAzureCredential()

# Initialize OpenAI client
client = openai.AzureOpenAI(
    azure_endpoint=f"https://{openai_account_name}.openai.azure.com",
    api_version=openai_api_version,
    azure_ad_token_provider=get_bearer_token_provider(msi, "https://cognitiveservices.azure.com/.default")
)

# Initialize search client
search_client = SearchClient(
    endpoint=search_service,
    index_name=search_index_name,
    credential=msi,
)

class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 10000

def estimate_token_count(text: str) -> int:
    """Estimate token count. Roughly 4 chars per token for English text."""
    return len(text) // 4

async def generate_embedding(user_prompt: str) -> list:
    try:
        response = await client.embeddings.create(
            model=openai_embedding_model,
            input=[user_prompt]
        )
        return response.data[0].embedding
    except Exception as e:
        raise RuntimeError(f"Embedding generation failed: {str(e)}")

#Step 2: Run Vector Search
def fetch_vector_search_results(embedding: list):
    try:
        results = search_client.search(
            search_text="", # required but ignored during vector search
            vector_queries=[{"kind":"vector", "vector":embedding, "fields":"contentVector","k_nearest_neighbors":5}],
            select=["content", "sourcefile"]
        )
        return [
            {
                "content": doc["content"],
                "source": doc["sourcefile"]
            }
            for doc in results]
    except Exception as e:
        raise RuntimeError(f"Vector search failed: {str(e)}")

#Step 3: Full Endpoint
@app.post("/chat/context")
async def chat(request: ChatRequest):
    user_prompt = request.prompt
    print(f"request: ", user_prompt)
    payload = {
        "messages": [{ "role": "user", "content": user_prompt}],
        "max_tokens":request.max_tokens
    }
    embedding = await generate_embedding(user_prompt)
    loop = asyncio.get_running_loop()
    matched_docs = await loop.run_in_executor(None, fetch_vector_search_results, embedding)
    context_chunks = [doc["content"] for doc in matched_docs]
    context = "\n\n".join(context_chunks)
    messages = [
        {"role": "system", "content": "You are a helpful assistant from Enterprise Data Product Team. Answer a summary only based on the provided context from the Data Products (DP) Documents."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_prompt}"}
    ]
    print("message (Context): ", messages)
    response = await client.chat.completions.create(
        model=openai_lang_model,
        messages=messages
    )
    reply = {
        "answer": response.choices[0].message.content.strip(),
        "citations": matched_docs
    }
    print("reply:: ", reply)
    return reply

@app.get("/")
def read_root():
    return {"message":"CORS is enabled!"}
    print("\n### OPENAI ###\n")
    c = CognitiveServicesManagementClient(credential=msi, subscription_id=subscription_id)
    print("OpenAI list deployment", list(c.deployments.list(openai_resource_group_name, openai_account_name)))
    token=get_bearer_token_provider(msi, "https://cognitiveservices.azure.com/.default")
    #print("OpenAI embedding:", client.embeddings.create(input=["The quick brown fox jumped over the lazy dog"], model=openai_embedding_model).data[0].embedding[:3])

@app.post("/chat/")
async def chat(request: ChatRequest):
    print("request: ",request.prompt)
    headers = {
        "Authorization":f"Bearer {token}",
        "Content-Type":"application/json"
    }
    payload = {
        "messages": [{ "role": "user", "content": request.prompt}],
        "max_tokens":request.max_tokens
    }
    
    response = await client.chat.completions.create(
        model="gpt-4o-2024-05-13-tpm",
        temperature=0.3,
        messages=[{"role": "user", "content": request.prompt}],
        stream=False)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

@app.post("/converter/")
async def converter(request: ChatRequest):
    print("request: ",request.prompt)
    system_prompt = "You are an expert in converting legacy COBOL code to modern Python Code."
    user_prompt = f"Convert the following COBOL code to Python code:\n{request.prompt}"
    headers = {
        "Authorization":f"Bearer {token}",
        "Content-Type":"application/json"
    }
    payload = {
        "messages": [
            { "role": "system", "content": system_prompt},
            { "role": "user", "content": user_prompt}],
        "temperature": 0.3,
        "max_tokens":request.max_tokens
    }
    response = await client.chat.completions.create(
        model="gpt-4o-2024-05-13-tpm",
        temperature=0.3,
        messages=[
            { "role": "system", "content": system_prompt},
            { "role": "user", "content": user_prompt}],
        stream=False)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# Request model for Code Explainer and additional actions
class CodeExplainRequest(BaseModel):
    code: str
    action: str = "explain"
    max_tokens: int = 300

@app.post("/code-explainer/")
async def code_explainer(request: CodeExplainRequest):
    print(f"Received request for code explanation: {request.action}")
    
    # Count tokens to avoid exceeding limits
    prompt_estimate = f"{request.action} this code: \n {request.code}"
    
    # Dynamic prompts based on user-selected actions
    if request.action == "simplify":
        system_prompt = f"You are a senior software engineer who simplifies complex code without changing functionality."
        user_prompt = f"Simplify this code: \n{request.code}"
        temperature = 0.5
        
    elif request.action == "optimize":
        system_prompt = f"You are a performance-oriented software engineer. Optimize the following code for speed and efficiency."
        user_prompt = f"Optimize this code: \n{request.code}"
        temperature = 0.5
        
    elif request.action == "summarize":
        system_prompt = f"You are a software engineer. Provide a high-level summary of what this code does."
        user_prompt = f"Summarize this code: \n{request.code}"
        temperature = 0.5
        
    else:
        system_prompt = (
            f"You are an Senior Software Engineer expert in all the programming languages"
            "Provide an explanation for the given code."
            "If the user requests a high-level summary, provide a concise overview"
            "If the user requests a detailed explanation, break down the code line by line"
        )
        user_prompt = (
            f"Explain the following code: \n"
            f"{request.code}"
        )
        temperature = 0.5
    
    # Call OpenAI with the prompt
    response = await client.chat.completions.create(
        model = openai_lang_model,
        temperature = temperature,
        messages = [
            { "role": "system", "content": system_prompt},
            { "role": "user", "content": user_prompt}],
        stream=False
    )
    return response.choices[0].message.content.strip()

class ArcherRequest(BaseModel):
    prompt: str
    max_tokens: int = 100

def ignore_rtf_to_text(rtf_content):
    """Convert RTF content to Plain Text, stripping all formatting."""
    # Remove RTF Header
    text = re.sub(r'^\{\\rtf1.*\}\s*', '', rtf_content)
    # Remove control words with their parameters
    text = re.sub(r'\\[a-zA-Z0-9]+(-?[0-9]+)?\\s?', '', text)
    # Remove hexadecimal codes
    text = re.sub(r'\\\'[0-9a-fA-F]{2}', '', text)
    # Remove curly braces groups with content inside
    # This requires multiple passes because nested braces
    while prev_text != text:
        prev_text = text
        text = re.sub(r'\\\{.*?\\\}', '', text)
    
    # Replace common RTF line breaks
    text = re.sub(r'\\par\s?', '\n', text)
    text = re.sub(r'\\line\s?', '\n', text)
    
    # Remove other RTF control sequences
    text = re.sub(r'\\[a-z]+', '', text)
    
    # Clean up extra whitespace and normalize line endings
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    
    # Remove any remaining RTF escape characters
    text = re.sub(r'\\([{}\\])', r'\1', text)
    
    return text.strip()

# Optimize content by extracting meaningful parts to reduce tokens
def optimize_content_for_tokens(content, max_length=10000):
    """Optimize content to reduce token usage while preserving meaning."""
    if len(content) <= max_length:
        return content
    
    # Keep beginning and end which often contain the most important information
    half_max = max_length // 2
    beginning = content[:half_max]
    end = content[-half_max:]
    
    return f"{beginning}\n\n[...{len(content) - max_length} characters truncated for token efficiency...]\n\n{end}"

@app.post("/archer/")
async def process_remediation_files(
    # Each file type as a separate parameter
    remediationPlan: Optional[UploadFile] = File(None),
    complianceRequirements: Optional[UploadFile] = File(None),
    findingsDetails: Optional[UploadFile] = File(None),
    
    # For optimized content sent directly
    remediationPlan_content: Optional[str] = Form(None),
    complianceRequirements_content: Optional[str] = Form(None),
    findingsDetails_content: Optional[str] = Form(None),
    
    # Custom prompt if provided
    customPrompt: Optional[str] = Form(None)
):
    # Validate that at least one file or content was provided
    if not any([
        remediationPlan, complianceRequirements, findingsDetails,
        remediationPlan_content, complianceRequirements_content, findingsDetails_content
    ]):
        raise HTTPException(status_code=400, detail="No files or content were provided")
    
    # Extract file contents
    file_contents = {}
    
    # Process remediation plan
    if remediationPlan_content:
        # Content already provided and preprocessed by frontend
        file_contents["remediation_plan"] = remediationPlan_content
    elif remediationPlan:
        content = await remediationPlan.read()
        content_str = content.decode("utf-8", errors="ignore")
        
        # Check if it's RTF and convert if needed
        if remediationPlan.filename.lower().endswith('.rtf'):
            content_str = rtf_to_text(content_str)
        
        # Optimize for tokens
        file_contents["remediation_plan"] = optimize_content_for_tokens(content_str)
    elif remediationPlan_metadata:
        metadata = json.loads(remediationPlan_metadata)
        if "summary" in metadata:
            file_contents["remediation_plan"] = metadata["summary"]
        else:
            file_contents["remediation_plan"] = f"[METADATA]: {json.dumps(metadata)}"
    
    # Process compliance requirements (similar logic)
    if complianceRequirements_content:
        file_contents["compliance_requirements"] = complianceRequirements_content
    elif complianceRequirements:
        content = await complianceRequirements.read()
        content_str = content.decode("utf-8", errors="ignore")
        
        if complianceRequirements.filename.lower().endswith('.rtf'):
            content_str = rtf_to_text(content_str)
            
        file_contents["compliance_requirements"] = optimize_content_for_tokens(content_str)
    elif complianceRequirements_metadata:
        metadata = json.loads(complianceRequirements_metadata)
        if "summary" in metadata:
            file_contents["compliance_requirements"] = metadata["summary"]
        else:
            file_contents["compliance_requirements"] = f"[METADATA]: {json.dumps(metadata)}"
    
    # Process findings details (similar logic)
    if findingsDetails_content:
        file_contents["findings_details"] = findingsDetails_content
    elif findingsDetails:
        content = await findingsDetails.read()
        content_str = content.decode("utf-8", errors="ignore")
        
        if findingsDetails.filename.lower().endswith('.rtf'):
            content_str = rtf_to_text(content_str)
            
        file_contents["findings_details"] = optimize_content_for_tokens(content_str)
    elif findingsDetails_metadata:
        metadata = json.loads(findingsDetails_metadata)
        if "summary" in metadata:
            file_contents["findings_details"] = metadata["summary"]
        else:
            file_contents["findings_details"] = f"[METADATA]: {json.dumps(metadata)}"
    
    # Construct the prompt with token optimization in mind
    prompt = ""
    
    if customPrompt:
        prompt = customPrompt
    else:
        prompt = """
Below is an audit **finding** and the associated **remediation plan**.
Please analyze the remediation plan and determine if it adequately addresses the compliance requirements
and findings details provided. Please:
1. Use the finding (including the control ID) to understand what the issue was.
2. Evaluate whether the remediation plan directly and completely addresses the issue.
3. Point out any misalignments, vague language, missing ownership, unrealistic deadlines, or gaps in policy alignment.

Base your analysis only on the provided documents.

Return the response like this:
- **Control ID**
- **Finding Details**
- **Remediation Details**
- **Overall Risk Score (High/Medium/Low)**
- **Confidence Score (%)**
- **Does the remediation plan fulfill all the compliance requirements? (Yes/No)**
- **Are there any gaps or missing elements in the plan?**
- **Could auditors potentially flag this plan as duplicate or invalid? If so, why?**
- **Specific recommendations to improve the remediation plan.**
- **Overall compliance score (out of 100) and justification.**
- **Issues Found: List of issues by dimension, including severity and recommendations**
- **Compliance Review: Policy alignment details.**
- **Similar Cases Comparison**
- **Gap Analysis**
- **Suggestions for Improvement**
- **Final Rating:** Good / Needs Improvement / Bad
"""
    
    # Add file contents to the prompt, ensuring we don't exceed token limits
    total_content_length = sum(len(content) for content in file_contents.values())
    max_content_per_file = 12000  # Adjust based on your token limits
    
    if total_content_length > 30000:  # Arbitrary limit to avoid token issues
        # Scale down each file's content proportionally
        scale_factor = 30000 / total_content_length
        for file_type, content in file_contents.items():
            max_len = int(len(content) * scale_factor)
            file_contents[file_type] = optimize_content_for_tokens(content, max_len)
    
    # Add optimized content to prompt
    for file_type, content in file_contents.items():
        prompt += f"\n\n{file_type.upper()}:\n{content}"
    
    try:
        api_url = f"https://{openai_account_name}.openai.azure.com/openai/deployments/gpt-4o-2024-05-13-tpm/chat/completions?api-version=2023-01-01-preview"
        print("apiUrl:: ", api_url)
        #print("prompt::", prompt)
        #headers = {"Authorization":f"Bearer {token}","Content-Type":"application/json"}
        response = await client.chat.completions.create(
            model="gpt-4o-2024-05-13-tpm",
            temperature=0,
            messages=[
                { "role": "system", "content": """You are a strict GRC Analyst, senior Risk Control Auditor, and an expert in compliance and remediation analysis specialized in audit remediation review with deep knowledge of regulatory frameworks and remediation practices. Your task is to evaluate remediation plans against compliance requirements and identify any potential gaps or areas for improvement.

When analyzing a remediation plan:
1. Determine if the plan adequately addresses all compliance requirements provided.
2. Identify any missing elements or areas that need strengthening.
3. Evaluate the timeline and resources allocated against industry best practices.
4. Check that remediation actions align with the severity of identified issues.
5. Ensure accountability and reporting mechanisms are clearly defined.
Provide your assessment with clear, actionable feedback on how to improve the remediation plan if needed."""},
                { "role": "user", "content": prompt}],
            stream=False)
        
        #payload = {
        #    "messages": [
        #        { "role": "system", "content": system_prompt},
        #        { "role": "user", "content": user_prompt}],
        #    "temperature": 0.3,
        #    "max_tokens":request.max_tokens
        #}
        #if response.status_code != 200:
        #    raise HTTPException(status_code=response.status_code, detail=response.text)
        reply_content = response.choices[0].message.content.strip()
        return JSONResponse(content={"response":reply_content})
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing with OpenAI: {str(e)}")

def optimize_content(content: str, max_tokens: int = 3000) -> str:
    """Optimize content to fit within token limits."""
    estimated_tokens = estimate_token_count(content)
    if estimated_tokens <= max_tokens:
        return content
    
    # For very long content, keep beginning and end
    char_limit = max_tokens * 4
    half_max = char_limit // 2
    beginning = content[:half_max]
    end = content[-half_max:]
    return f"{beginning}\n\n[...{estimated_tokens - max_tokens} tokens truncated...]\n\n{end}"

@app.post("/archer/rewrite")
async def rewrite_remediation(
    remediationPlan: UploadFile = File(...),
    analysisContext: str = Form(...),
    action: str = Form(...)):
    """API endpoint to rewrite a remediation plan based on analysis feedback."""
    try:
        # Check if the action is rewrite
        if action != "rewrite":
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid action: {action}. Expected 'rewrite'"}
            )
        
        # Read and process the remediation plan file
        content = await remediationPlan.read()
        file_content = content.decode("utf-8")
        # Handle RTF files
        if remediationPlan.filename.lower().endswith('.rtf'):
            file_content = rtf_to_text(file_content)
        # Optimize content to ensure it fits within token limits
        optimized_plan = optimize_content(file_content, 2000)  # Use lower limit to leave room for prompt
        # Create a system prompt that guides the rewrite
        system_prompt = """
You are a compliance expert tasked with improving a remediation plan based on feedback.
Consider the following:
1. Ensure all compliance requirements are fully addressed
2. Include clear timelines and ownership for each action
3. Add specific metrics for measuring success
4. Include validation steps to verify effectiveness
5. Consider budget and resource constraints
Rewrite the remediation plan to address the analysis feedback while maintaining the original scope.
Format your response as a well-structured remediation plan with clear sections.
"""
        response = await client.chat.completions.create(
            model="gpt-4o-2024-05-13-tpm",
            temperature=0.7,
            messages=[
                { "role": "system", "content": system_prompt},
                { "role": "user", "content": f"Here is the original remediation plan:\n\n{optimized_plan}\n\nHere is the analysis feedback:\n\n{analysisContext}\n\nPlease rewrite the remediation plan to address all the issues mentioned in the analysis."}],
            stream=False)
        
        # Extract the rewritten plan from the API response
        rewritten_plan = response.choices[0].message.content
        # Return the rewritten plan
        return {
            "rewrittenPlan": rewritten_plan,
            "originalLength": len(file_content),
            "rewrittenLength": len(rewritten_plan)
        }
    except Exception as e:
        print(f"Error rewriting remediation plan: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to rewrite remediation plan: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
