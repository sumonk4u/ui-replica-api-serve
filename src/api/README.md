
# FastAPI Backend for RAG System with SSO Authentication

This backend provides API endpoints for authentication via PingFederate SSO and a Retrieval Augmented Generation (RAG) system for document search and chat.

## Setup Instructions

1. Create a Python virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```
   uvicorn index:app --host 0.0.0.0 --port 8000 --reload
   ```

## Configuration

Update the configuration in `config.py` with your specific:
- PingFederate SSO details
- Azure Data Lake Storage (ADLS) connection information
- Vector database connection details
- LLM API credentials

