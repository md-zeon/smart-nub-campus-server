import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { UserStatus } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import AppError from "../errorHelpers/AppError";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const verifySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // get the session from the request headers using better-auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // check if the session is valid
    if (!session?.user || !session.session) {
      throw new AppError(status.UNAUTHORIZED, "Invalid or expired session.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        student: true,
        admin: true,
        profile: true,
      },
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

    if (!user.hasCompletedOnboarding) {
      throw new AppError(
        status.FORBIDDEN,
        "Please complete onboarding before accessing the platform.",
      );
    }

    // Attach the user and session to the request object for further use in the application
    req.user = user;
    req.session = {
      ...session.session,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    };

    // Attach student and admin to the request object if they exist
    req.student = user.student ?? undefined;
    req.admin = user.admin ?? undefined;

    next();
  } catch (error) {
    next(error);
  }
};

export default verifySession;
