import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import AppError from "../errorHelpers/AppError";
import { auth } from "../lib/auth";

const verifySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as Record<string, string>,
    });

    if (!session?.user) {
      throw new AppError(status.UNAUTHORIZED, "Invalid or expired session.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        student: true,
        admin: true,
      },
    });

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, "User not found.");
    }

    if (user.isDeleted) {
      throw new AppError(status.FORBIDDEN, "Account has been deleted.");
    }

    if (user.status === UserStatus.BANNED) {
      throw new AppError(status.FORBIDDEN, "Account has been banned.");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(status.FORBIDDEN, "Account is suspended.");
    }

    req.user = user as typeof user & {
      role: UserRole;
      status: UserStatus;
      isDeleted: boolean;
    };
    req.session = session.session as typeof session.session;
    req.student = user.student ?? undefined;
    req.admin = user.admin ?? undefined;

    next();
  } catch (error) {
    next(error);
  }
};

export default verifySession;
