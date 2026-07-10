import { RequestUser } from "./identity.interface";

const me = (user: RequestUser) => {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      image: user.image,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    student: user.student || null,
    admin: user.admin || null,
  };
};

export const authService = {
  me,
};
