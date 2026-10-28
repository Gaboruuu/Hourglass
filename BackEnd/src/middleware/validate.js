const { HttpError } = require("./errorHandler");

/**
 * Validates req.body against a zod schema and replaces it with the parsed (trimmed, converted) value.
 * Fails with 400 and the list of fields that didn't pass.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    }));
    return next(new HttpError(400, "Invalid request", errors));
  }
  req.body = result.data;
  next();
};

module.exports = { validate };
