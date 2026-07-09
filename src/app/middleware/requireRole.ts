import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { UserRole } from "../../generated/prisma/enums";
import AppError from "../errorHelpers/AppError";

const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, "Authentication required.");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(
        status.FORBIDDEN,
        "You do not have permission to access this resource.",
      );
    }

    next();
  };
};

export default requireRole;
