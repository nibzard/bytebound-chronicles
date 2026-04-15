export const clientConfig = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.bytebound.dev' 
    : `http://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '8080'}`,
  
  wsUrl: process.env.NODE_ENV === 'production'
    ? 'wss://api.bytebound.dev/ws'
    : `ws://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '8080'}/ws`,
};