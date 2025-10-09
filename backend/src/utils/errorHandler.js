// Custom error classes
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed', errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || [];
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// Async handler to catch async/await errors
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
