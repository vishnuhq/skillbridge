/**
 * Routes Index
 * Binds all route modules to the Express app
 */

import attendanceRoutes from './attendance.js';
import authRoutes from './auth.js';
import batchRoutes from './batch.js';
import institutionRoutes from './institution.js';
import programmeRoutes from './programme.js';
import publicRoutes from './public.js';
import sessionRoutes from './session.js';

/**
 * Configures all routes for the application
 * @param {Express} app - Express application instance
 */
const configureRoutes = (app) => {
  // Backend routes
  app.use('/public', publicRoutes);
  app.use('/auth', authRoutes);
  app.use('/batches', batchRoutes);
  app.use('/sessions', sessionRoutes);
  app.use('/attendance', attendanceRoutes);
  app.use('/institution', institutionRoutes);
  app.use('/institutions', institutionRoutes);
  app.use('/programme', programmeRoutes);
};

export default configureRoutes;
