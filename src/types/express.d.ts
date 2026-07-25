import { Admin, Session, Student } from "../generated/prisma/client";
import { RequestUser } from "../app/module/identity/identity.interface";

declare global {
  namespace Express {
    interface Request {
      user: RequestUser;
      session: Session;
      student?: Student;
      admin?: Admin;
    }
  }
}
