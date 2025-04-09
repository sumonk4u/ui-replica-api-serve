// API configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://10.20.30.405:3000'; // Machine 2's IP address and port

// Other global configuration variables can be added here
