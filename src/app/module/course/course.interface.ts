import { Department } from "../../../generated/prisma/enums";

export interface CourseDetailResponse {
  id: string;
  code: string;
  name: string;
  department: Department;
  semester: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    resources: number;
    discussions: number;
    questions: number;
  };
}
