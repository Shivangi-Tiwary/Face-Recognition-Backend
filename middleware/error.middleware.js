/**
 * Global Error Handler - Production-Ready
 */

module.exports = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message);
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please login again.";
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired. Please login again.";
  }

  // AI Service Error
  if (err.code === "ECONNREFUSED" && (err.config?.url?.includes("8000") || err.config?.baseURL?.includes("8000"))) {
    statusCode = 503;
    message = "AI Recognition Service is currently offline. Please start the Python backend.";
  }

  console.error(`\n❌ [ERROR]: ${message}`);
  if (err.stack) console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};