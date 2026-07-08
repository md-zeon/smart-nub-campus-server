/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import envVars from "../../config/env";
import status from "http-status";
import z from "zod";
import { IErrorSource, TErrorResponse } from "../interfaces/error.interface";
import { handleZodError } from "../errorHelpers/handleZodError";
import AppError from "../errorHelpers/AppError";

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (envVars.NODE_ENV === "development") {
    console.error("Error from global error handler:", err);
  }

  let errorSources: IErrorSource[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";
  let stack: string | undefined;

  if (err instanceof z.ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = err.cause ? [{ path: "", message: String(err.cause) }] : [];
  } else if (err instanceof Error) {
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
  }

  const errorResponse: TErrorResponse = {
    success: false,
    message: message,
    errorSources: errorSources,
    error: envVars.NODE_ENV === "development" ? err : undefined,
    stack: envVars.NODE_ENV === "development" ? stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};

export default globalErrorHandler;
