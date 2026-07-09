import { Session, User, Student, Admin } from "../generated/prisma";
import { UserRole, UserStatus } from "../generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      user?: User & { role: UserRole; status: UserStatus; isDeleted: boolean };
      session?: Session;
      student?: Student;
      admin?: Admin;
    }
  }
}
