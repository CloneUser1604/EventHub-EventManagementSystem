/**
 * Standard API response helpers
 */

const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const createdResponse = (res, data = null, message = 'Created successfully') => {
  return successResponse(res, data, message, 201);
};

const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 'Validation failed', 422, errors);
};

const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, message, 401);
};

const forbiddenResponse = (res, message = 'Forbidden - Insufficient permissions') => {
  return errorResponse(res, message, 403);
};

const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404);
};

const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 409);
};

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
};
