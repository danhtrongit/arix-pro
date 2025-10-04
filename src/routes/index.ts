import express from 'express';
import { ChatController } from '../controllers/chatController';

const router = express.Router();

// Health check
router.get('/api', (req, res) => {
  res.send('hello');
});

// Chat endpoint
router.post('/api/chat', ChatController.smartChat);

export default router;

