import { prisma } from "../../src/app/lib/prisma";

const categories = [
  { name: "Academics", slug: "academics", icon: "graduation-cap" },
  { name: "Programming", slug: "programming", icon: "code" },
  { name: "Database", slug: "database", icon: "database" },
  { name: "Web Development", slug: "web-development", icon: "globe" },
  { name: "AI/ML", slug: "ai-ml", icon: "brain" },
  { name: "Projects", slug: "projects", icon: "folder" },
  { name: "Career", slug: "career", icon: "briefcase" },
  { name: "Others", slug: "others", icon: "more-horizontal" },
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
