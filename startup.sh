
#!/bin/bash

# Start the FastAPI server
cd /home/site/wwwroot
gunicorn api.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:3000 &

# Serve the static files using a simple express server
cd /home/site/wwwroot
node server.js
