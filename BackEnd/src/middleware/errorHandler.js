/**
 * An error whose message is safe to show to the client (validation, not found, conflicts).
 * Anything else that reaches the error handler is reported as a generic 500.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

/** Express 4 doesn't catch rejected promises: this forwards async errors to the error handler */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Not found" });
};

// Express recognizes error handlers by their 4 arguments, so `next` must stay even though it's unused
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    const body = { message: err.message };
    if (err.details) body.errors = err.details;
    return res.status(err.status).json(body);
  }

  // Errors from express.json(): invalid JSON (400), body too large (413). Their messages are generic.
  if (err.expose && err.status >= 400 && err.status < 500) {
    const message = err.type === "entity.parse.failed" ? "Invalid JSON" : err.message;
    return res.status(err.status).json({ message });
  }

  // Details stay in the server logs: SQL errors and stack traces never reach the client
  console.error(`${req.method} ${req.originalUrl} 500`, err);
  res.status(500).json({ message: "Internal server error" });
};

module.exports = { HttpError, asyncHandler, notFoundHandler, errorHandler };
