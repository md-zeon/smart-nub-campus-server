import { prisma } from "../../src/app/lib/prisma";

const categories = [
  { name: "Academics", slug: "academics", icon: "graduation-cap" },
  { name: "Programming", slug: "programming", icon: "code" },
  { name: "Projects", slug: "projects", icon: "folder" },
  { name: "Career", slug: "career", icon: "briefcase" },
  { name: "Events", slug: "events", icon: "calendar" },
  { name: "General", slug: "general", icon: "message-circle" },
  { name: "Internships", slug: "internships", icon: "building" },
  { name: "Research", slug: "research", icon: "search" },
];

export async function seedDiscussions() {
  const result = await prisma.discussionCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} discussion categories.`);
}
