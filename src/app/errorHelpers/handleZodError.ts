import status from "http-status";
import { IErrorSource, TErrorResponse } from "../interfaces/error.interface";
import z from "zod";

export const handleZodError = (error: z.ZodError): TErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = "Zod Validation Error";
  const errorSources: IErrorSource[] = [];

  error.issues.forEach((issue) => {
    const pathValue =
      issue.path.length > 1
        ? issue.path.join(".")
        : issue.path.length === 1
          ? String(issue.path[0])
          : "(root)";
    errorSources.push({
      path: pathValue,
      message: issue.message,
    });
  });

  return {
    success: false,
    statusCode,
    message,
    errorSources,
    error,
  };
};
