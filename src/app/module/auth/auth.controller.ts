import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { authService } from "./auth.service";

const login = catchAsync(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const { data, headers } = await authService.login(identifier, password);

  const cookies = headers.getSetCookie(); // Get the Set-Cookie headers from the response

  if (cookies.length > 0) {
    // Set the cookies in the response headers
    res.setHeader("Set-Cookie", cookies);
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Login successful.",
    data: data,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { headers } = await authService.logout(
    req.headers as Record<string, string>,
  );

  const cookies = headers.getSetCookie(); // Get the Set-Cookie headers from the response

  // Clear the cookies in the response headers
  if (cookies.length > 0) {
    res.setHeader("Set-Cookie", cookies);
  }

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
