import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";

const app: Application = express();

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.send("Welcome to the Smart NUB Campus API");
});

export default app;
