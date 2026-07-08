import status from "http-status";
import { IErrorSource, TErrorResponse } from "../interfaces/error.interface";
import z from "zod";

export const handleZodError = (error: z.ZodError): TErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = "Zod Validation Error";
  const errorSources: IErrorSource[] = [];

  error.issues.forEach((issue) => {
    errorSources.push({
      path:
        issue.path.length > 1 ? issue.path.join(".") : issue.path[0].toString(),
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
