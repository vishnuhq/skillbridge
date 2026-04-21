/**
 * Global Error Handler
 *
 */

/**
 * @type {import('express').ErrorRequestHandler}
 */
export const errorHandler = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  // Don't leak stack traces to clients in production
  if (status === 500) {
    console.error(`[ERROR] ${req.method} ${req.path}`, err);
  }

  res.status(status).json({ error: message });
};
