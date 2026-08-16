import { prisma } from "../../src/app/lib/prisma";

const categories = [
  { name: "Academics", slug: "academics", icon: "graduation-cap" },
  { name: "Programming", slug: "programming", icon: "code" },
  { name: "Projects", slug: "projects", icon: "folder" },
  { name: "Career", slug: "career", icon: "briefcase" },
  { name: "Events", slug: "events", icon: "calendar" },
  { name: "General", slug: "general", icon: "message-circle" },
  { name: "Internships", slug: "internships", icon: "briefcase" },
  { name: "Research", slug: "research", icon: "flask" },
];

export async function seedQA() {
  const result = await prisma.questionCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} question categories.`);
}
