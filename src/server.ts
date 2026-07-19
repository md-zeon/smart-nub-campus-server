import { createServer } from "node:http";
import app from "./app";
import ENVVARS from "./config/env";
import { initSocketServer } from "./app/lib/socket";

const bootstrap = () => {
  try {
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = initSocketServer(httpServer);

    httpServer.listen(ENVVARS.PORT, () => {
      console.log(
        `Server is running on http://localhost:${ENVVARS.PORT}`,
      );
      console.log(
        `[Socket.IO] Listening on path /socket.io/`,
      );
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

bootstrap();
