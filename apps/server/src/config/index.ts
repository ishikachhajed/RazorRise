import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_123456',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key_123456',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_123456',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
