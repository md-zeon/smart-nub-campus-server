import type { Socket } from "socket.io";
import { auth } from "../../auth";
import { prisma } from "../../prisma";
import validateUserStatus from "../../../shared/validateUserStatus";

/**
 * Socket.IO middleware that validates the connecting client's session via
 * Better Auth. On success it attaches the authenticated user to
 * `socket.data.user`.
 *
 * The client must send the session token in the handshake auth:
 *   { token: "better-auth-session-token" }
 *
 * Better Auth also supports cookie-based sessions — if the client sends
 * cookies, those are forwarded automatically by the Socket.IO client
 * library when `withCredentials: true` is set.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const authenticate = async (): Promise<void> => {
    try {
      // Build headers from the handshake — Better Auth reads from here.
      // We forward cookies if present, plus any custom auth header.
      const headers = new Headers();

      // Forward cookies from the handshake
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        headers.set("cookie", cookieHeader);
      }

      // Also support a token passed via handshake auth
      const token = socket.handshake.auth.token as string | undefined;
      if (token) {
        // Better Auth uses the `authorization` header convention
        headers.set("authorization", `Bearer ${token}`);
      }

      // If neither cookies nor token are present, reject
      if (!cookieHeader && !token) {
        next(new Error("Authentication required. Provide a session token or cookie."));
        return;
      }

      // Validate session via Better Auth
      const { fromNodeHeaders } = await import("better-auth/node");

      // Reconstruct Node-style headers for Better Auth
      const nodeHeaders: Record<string, string | string[] | undefined> = {};
      if (cookieHeader) {
        nodeHeaders["cookie"] = cookieHeader;
      }
      if (token) {
        nodeHeaders["authorization"] = `Bearer ${token}`;
      }

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(nodeHeaders),
      });

      if (!session?.user || !session.session) {
        next(new Error("Invalid or expired session."));
        return;
      }

      // Fetch full user record with relations
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          student: true,
          admin: true,
        },
      });

      if (!user) {
        next(new Error("User not found."));
        return;
      }

      const statusError = validateUserStatus(user);
      if (statusError) {
        next(new Error(statusError));
        return;
      }

      // Attach authenticated user to socket data
      socket.data.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        student: user.student ?? null,
        admin: user.admin ?? null,
      };

      next();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      next(new Error(message));
    }
  };

  void authenticate();
}
