import { prisma } from "../../lib/prisma";
import { CourseDetailResponse } from "./course.interface";

const getCourseById = async (
  id: string,
): Promise<CourseDetailResponse | null> => {
  return prisma.course.findUnique({
    where: { id },
    include: {
      _count: {
        select: { resources: true, discussions: true, questions: true },
      },
    },
  });
};

export const courseService = {
  getCourseById,
};
