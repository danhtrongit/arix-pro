import express from 'express';
import { CONFIG } from './config/constants';
import routes from './routes';

const app = express();

// Middleware
app.use(express.json());

// CORS (nếu cần)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use(routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = CONFIG.PORT;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          AriX Stock Analysis API Server                    ║
╠════════════════════════════════════════════════════════════╣
║  Server:         http://localhost:${PORT}                      ║
║  Status:         Running ✓                                  ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  ├─ GET  /api                   - Health check            ║
║  └─ POST /api/chat              - Smart chat with auto    ║
║                                   stock detection          ║
╠════════════════════════════════════════════════════════════╣
║  Model:          ${CONFIG.DEFAULT_MODEL.padEnd(40)} ║
║  Max Reports:    ${CONFIG.MAX_REPORTS_TO_ANALYZE}                                           ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;

