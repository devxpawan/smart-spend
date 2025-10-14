// Simple test to verify the server is working
import express from 'express';

const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API endpoint is working!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});