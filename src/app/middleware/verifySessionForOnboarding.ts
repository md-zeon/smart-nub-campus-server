import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { UserStatus } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import AppError from "../errorHelpers/AppError";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const verifySessionForOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user || !session.session) {
      throw new AppError(status.UNAUTHORIZED, "Invalid or expired session.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, "User not found.");
    }

    if (user.isDeleted) {
      throw new AppError(
        status.FORBIDDEN,
        "Your account has been deleted. Please contact support.",
      );
    }

    if (user.isDeactivated) {
      throw new AppError(
        status.FORBIDDEN,
        "Your account has been deactivated. Please contact support.",
      );
    }

    if (user.status === UserStatus.BANNED) {
      throw new AppError(
        status.FORBIDDEN,
        "Your account has been banned. Please contact support.",
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        status.FORBIDDEN,
        "Your account is suspended. Please contact support.",
      );
    }

    req.user = user;
    req.session = {
      ...session.session,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default verifySessionForOnboarding;
