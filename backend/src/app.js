// @ts-check
/**
 * @module backend/app
 *
 * Express application setup with all middleware and routes.
 * Separated from server.js to enable testing without starting the HTTP server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import predictRouter from './routes/predict.js';
import historyRouter from './routes/history.js';
import modelInfoRouter from './routes/model-info.js';
import { config } from './utils/config.js';

const app = express();

// ============================================================
// Security Middleware
// ============================================================

app.use(helmet({
  // Allow Swagger UI to load inline scripts/styles
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
}));

app.use(cors({
  origin: config.nodeEnv === 'production'
    ? ['https://mgtab-detector.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// Body Parsing
// ============================================================

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Rate Limiting
// ============================================================

app.use('/api/', apiLimiter);

// ============================================================
// API Routes (versioned)
// ============================================================

app.use('/api/v1/predict', predictRouter);
app.use('/api/v1/history', historyRouter);
app.use('/api/v1/model', modelInfoRouter);

// Health check at root level (for load balancers)
app.get('/api/v1/health', (_req, res) => {
  res.redirect('/api/v1/model/health');
});

// Root welcome
app.get('/', (_req, res) => {
  res.json({
    name: 'MGTAB Detector API',
    version: '1.0.0',
    docs: '/api/v1/model/info',
    health: '/api/v1/model/health',
    endpoints: {
      predict: 'POST /api/v1/predict',
      history: 'GET /api/v1/history',
      modelInfo: 'GET /api/v1/model/info',
      health: 'GET /api/v1/model/health',
    },
  });
});

// ============================================================
// Error Handler (must be last)
// ============================================================

app.use(errorHandler);

export default app;
