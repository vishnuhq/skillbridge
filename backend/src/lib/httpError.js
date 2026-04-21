/**
 * HttpError — typed HTTP errors for use in controllers + middleware
 *
 * Usage:
 *   throw new HttpError(404, 'User not found');
 *   throw new HttpError(403, 'Forbidden');
 */
export class HttpError extends Error {
  /**
   * @param {number} status  - HTTP status code (400, 401, 403, 404, etc.)
   * @param {string} message - Human-readable error message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
