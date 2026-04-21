/**
 * Validation Middleware
 *
 */

/**
 * Returns a middleware that validates req.body against the given Zod schema.
 * On failure, responds 400 with field-level errors.
 * On success, attaches parsed data to `req.validated` and calls next().
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      fields: result.error.flatten().fieldErrors,
    });
  }

  req.validated = result.data;
  next();
};
