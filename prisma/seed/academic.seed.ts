import { prisma } from "../../src/app/lib/prisma";
import { Department } from "../../src/generated/prisma/enums";

const courses = [
  { code: "CSE-221", name: "Data Structures & Algorithms", department: Department.CSE, semester: 4 },
  { code: "CSE-211", name: "Object-Oriented Programming", department: Department.CSE, semester: 3 },
  { code: "CSE-213", name: "Database Management Systems", department: Department.CSE, semester: 4 },
  { code: "CSE-222", name: "Discrete Mathematics", department: Department.CSE, semester: 4 },
  { code: "CSE-231", name: "Operating Systems", department: Department.CSE, semester: 5 },
];

export async function seedAcademic() {
  const existingCount = await prisma.course.count();
  if (existingCount > 0) {
    console.log("Courses already exist. Skipping academic seed.");
    return;
  }

  for (const course of courses) {
    await prisma.course.upsert({
      where: { code: course.code },
      update: {},
      create: course,
    });
  }

  console.log(`Seeded ${courses.length} courses.`);
}
