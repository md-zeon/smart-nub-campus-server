import { NextFunction, Request, Response } from "express";
import z from "zod";

const validateRequest = (schema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsedResult = schema.safeParse(req.body);

    if (!parsedResult.success) {
      return next(parsedResult.error);
    }

    // sanitizing the request body by removing any extra fields that are not defined in the schema
    req.body = parsedResult.data;
    next();
  };
};

export default validateRequest;
