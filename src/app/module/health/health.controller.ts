import { Request, Response } from "express";
import status from "http-status";
import { prisma } from "../../lib/prisma";

const healthCheck = async (_req: Request, res: Response) => {
  const payload = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(status.OK).json({ ...payload, database: "connected" });
  } catch {
    res
      .status(status.SERVICE_UNAVAILABLE)
      .json({ ...payload, database: "unavailable" });
  }
};

export const healthController = { healthCheck };
