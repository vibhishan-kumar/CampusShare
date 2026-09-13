// Centralized Error Handling Middleware
function errorHandler(err, req, res, next) {
  console.error('Unhandled API Error:', err);

  // PostgreSQL or SQLite unique violation
  if (err.code === '23505' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
      detail: err.detail || err.message,
    });
  }

  // PostgreSQL check violation (e.g. email domain)
  if (err.code === '23514' || (err.message && err.message.includes('CHECK constraint failed'))) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Check constraint violated (ensure email ends with @uohyd.ac.in).',
      detail: err.detail || err.message,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
