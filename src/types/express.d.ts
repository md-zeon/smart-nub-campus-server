import { Admin, Session, Student, User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: User;
      session: Session;
      student?: Student;
      admin?: Admin;
    }
  }
}
