import { Request, Response, NextFunction } from "express";
import { ValidationError, UniqueConstraintError } from "sequelize";
import { ApiError } from "../utils/ApiError";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // ✅ Sequelize Validation Error
  if (err instanceof ValidationError) {
    statusCode = 400;

    const field = err.errors?.[0]?.path || "Field";
    const msg = err.errors?.[0]?.message || "Validation failed";

    message = `${msg}`;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // ✅ Sequelize Unique Constraint Error
  if (err instanceof UniqueConstraintError) {
    statusCode = 409;

    const field = err.errors?.[0]?.path || "Field";
    const value = err.errors?.[0]?.value;

    message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists.`;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // ✅ Mongoose validation error
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    const errorValues = Object.values(err.errors) as any[];
    message = errorValues[0]?.message || "Validation failed";
  }

  // ✅ Mongo duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value already exists";
  }

  // ✅ Zod validation error
  if (err.name === "ZodError") {
    statusCode = 400;
    message = err.errors?.[0]?.message || "Validation failed";
    errors = err.errors;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
};

export default errorHandler;
