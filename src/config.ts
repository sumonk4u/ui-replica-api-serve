// API configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://MACHINE2_IP:3000'; // Replace MACHINE2_IP with your Machine 2's IP address

// Other global configuration variables can be added here
