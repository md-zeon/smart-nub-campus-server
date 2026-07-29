import pino from "pino";
import pinoHttp from "pino-http";
import ENVVARS from "../../config/env";

const isDev = ENVVARS.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "debug" : "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, singleLine: true },
    },
  }),
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id ?? crypto.randomUUID(),
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} ${err.message}`;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/api/v1/health",
  },
});
