
#!/bin/bash

# Build the Vite app
echo "Building Vite app..."
npm run build

# Create a simple server to serve the app on port 3000
echo "Creating server.js file..."
cat > server.js << 'EOL'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API requests to the FastAPI backend
app.use('/api', (req, res, next) => {
  // In development, API calls are proxied to Machine 2
  const apiServer = 'http://localhost:3000';
  const apiPath = req.originalUrl.replace('/api', '');
  
  require('http').get(`${apiServer}${apiPath}`, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  }).on('error', (e) => {
    console.error(`API Proxy Error: ${e.message}`);
    res.status(500).send('API Server Error');
  });
});

// For any request that doesn't match a static file, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
EOL

# Install express if not already installed
echo "Installing express..."
npm install express http-proxy-middleware --save

echo "Setup complete!"
echo "Run 'node server.js' to start the server on port 3000"
