import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import ENVVARS from "../../config/env";

const connectionString = ENVVARS.DATABASE_URL;

const adapter = new PrismaPg({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const prisma = new PrismaClient({
  adapter,
  ...(ENVVARS.NODE_ENV === "development" && {
    log: ["warn", "error"],
  }),
});

export { prisma };
