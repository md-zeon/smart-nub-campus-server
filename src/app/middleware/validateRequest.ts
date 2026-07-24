import { NextFunction, Request, Response } from "express";
import z from "zod";

type ValidationTarget = "body" | "query" | "params";

const validateRequest = (
  schema: z.ZodObject,
  target: ValidationTarget = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[target];
    const parsedResult = schema.safeParse(dataToValidate);

    if (!parsedResult.success) {
      return next(parsedResult.error);
    }

    // sanitizing the request by removing any extra fields that are not defined in the schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = parsedResult.data;
    next();
  };
};

export default validateRequest;
