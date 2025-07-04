export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Handle express-validator errors
  if (err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors,
    });
  }

  // Handle mongoose errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Database validation failed",
      errors: Object.values(err.errors).map((error) => error.message),
    });
  }

  // Handle JWT errors
  if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }

  // Handle mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      status: "error",
      message: "Duplicate key error",
      field: Object.keys(err.keyPattern)[0],
    });
  }

  // Default error
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
