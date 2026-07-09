import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { authService } from "./auth.service";

const login = catchAsync(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const result = await authService.login(identifier, password);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Login successful.",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.headers as Record<string, string>);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Logout successful.",
  });
});

const me = catchAsync(async (req: Request, res: Response) => {
  const result = authService.me(req);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User retrieved successfully.",
    data: result,
  });
});

export const authController = {
  login,
  logout,
  me,
};
