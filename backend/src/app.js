/**
 * Express App
 */

import { clerkMiddleware } from '@clerk/express';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.js';
import configureRoutes from './routes/index.js';

const app = express();

// Security and logging
app.use(helmet());

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
//     credentials: true, // allow cookies/auth headers cross-origin
//   })
// );

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Clerk auth context
app.use(clerkMiddleware());

// Body parsing
app.use(express.json());

// Backend Routes
configureRoutes(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

export default app;
