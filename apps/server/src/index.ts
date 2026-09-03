import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import apiRoutes from './routes/api.js';

const app = express();

app.use(cors({
  origin: '*', // Allow local frontend during hackathon
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
}));

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RazorFlow AI Backend',
    mode: config.nodeEnv,
    aiProvider: config.aiProvider,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 RazorFlow AI Server listening on http://localhost:${PORT}`);
  console.log(`⚡ Provider Mode: ${config.aiProvider} | Razorpay Mode: Test Mode`);
});

export default app;
