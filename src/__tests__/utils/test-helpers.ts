import { vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

export const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined as any,
    session: undefined as any,
    student: undefined,
    admin: undefined,
    ...overrides,
  } as Request;
};

export const createMockResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    removeHeader: vi.fn(),
    redirect: vi.fn().mockReturnThis(),
    locals: {},
  } as unknown as Response;
  return res;
};

export const createMockNext = (): NextFunction => {
  return vi.fn() as unknown as NextFunction;
};

export const createAuthenticatedRequest = (userOverrides: Record<string, any> = {}) => {
  return createMockRequest({
    user: {
      id: "test-user-id-001",
      name: "Test User",
      email: "test@example.com",
      role: "STUDENT",
      status: "ACTIVE",
      isDeleted: false,
      ...userOverrides,
    },
    session: {
      id: "test-session-id-001",
      userId: "test-user-id-001",
      expiresAt: new Date(Date.now() + 86400000),
      token: "mock-token",
    },
  });
};

export const createAdminRequest = () => {
  return createAuthenticatedRequest({
    id: "test-admin-id-001",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
  });
};
