import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(function (this: any, options: any) {
    this.__adapter = "pg";
    this.options = options;
  }),
}));

vi.mock("../../../generated/prisma/client", () => ({
  PrismaClient: vi.fn(function (this: any) {
    this.$connect = vi.fn();
    this.$disconnect = vi.fn();
    this.$transaction = vi.fn();
    this.$on = vi.fn();
    this.user = {};
  }),
}));

vi.mock("../../../config/env", () => ({
  default: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test_db",
  },
}));

import { prisma } from "../prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

const mockPrismaClient = vi.mocked(PrismaClient);
const mockPrismaPg = vi.mocked(PrismaPg);

describe("prisma client", () => {
  it("exports a prisma instance with the expected shape", () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
    expect(typeof prisma.$transaction).toBe("function");
    expect(prisma.user).toBeDefined();
  });

  it("constructs the PrismaPg adapter with the configured connection string", () => {
    expect(mockPrismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://test:test@localhost:5432/test_db",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  });

  it("constructs PrismaClient with the pg adapter", () => {
    expect(mockPrismaClient).toHaveBeenCalledWith({
      adapter: expect.objectContaining({ __adapter: "pg" }),
    });
  });
});
