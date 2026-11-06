'use strict';

class AppError extends Error {
  // `extra` is merged into the JSON error response alongside `error` —
  // e.g. googleLogin returns { error, google_name, google_email } so the
  // frontend can offer "link your Google account" with a prefilled name.
  constructor(message, status, extra) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.extra = extra;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', extra) {
    super(message, 401, extra);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
