
#!/bin/bash
set -e

echo "Starting deployment process..."

# Install Node.js dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "Installing Node.js dependencies..."
  npm ci --only=production
fi

# Install Python dependencies if not already installed
if [ ! -d "api/__pycache__" ]; then
  echo "Installing Python dependencies..."
  pip install --no-cache-dir -r api/requirements.txt
fi

# Start the FastAPI server
echo "Starting FastAPI backend..."
cd /home/site/wwwroot
gunicorn api.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:3000 &

# Wait for backend to start
sleep 5
echo "Backend started"

# Start the Express server to serve static files and proxy API requests
echo "Starting Express server for frontend..."
node server.js
