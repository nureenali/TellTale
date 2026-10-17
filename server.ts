import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './server/api.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// API routes
app.use('/api', apiRouter);

// Serve static frontend in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TellTale production server running on port ${PORT}`);
});
