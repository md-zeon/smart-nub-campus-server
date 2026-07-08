import app from "./app";
import ENVVARS from "./config/env";

const bootstrap = () => {
  try {
    app.listen(ENVVARS.PORT, () => {
      console.log(`Server is running on http://localhost:${ENVVARS.PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

bootstrap();
