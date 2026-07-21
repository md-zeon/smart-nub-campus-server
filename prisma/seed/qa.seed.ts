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
  const existingCount = await prisma.questionCategory.count();
  if (existingCount > 0) {
    console.log("Question categories already exist. Skipping Q&A seed.");
    return;
  }

  for (const category of categories) {
    await prisma.questionCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} question categories.`);
}
