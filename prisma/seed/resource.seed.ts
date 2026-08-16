import { prisma } from "../../src/app/lib/prisma";

const categories = [
  { name: "Notes", slug: "notes", icon: "note", description: "Course notes and study materials" },
  { name: "Past Papers", slug: "past-papers", icon: "file-text", description: "Previous exam papers and solutions" },
  { name: "Books & Textbooks", slug: "books", icon: "book", description: "Textbooks and reference books" },
  { name: "Slides & Presentations", slug: "slides", icon: "presentation", description: "Lecture slides and presentations" },
  { name: "Code & Projects", slug: "code", icon: "code", description: "Source code, project files, and templates" },
  { name: "Videos & Tutorials", slug: "videos", icon: "video", description: "Video tutorials and lecture recordings" },
  { name: "Tools & Software", slug: "tools", icon: "tool", description: "Useful software tools and utilities" },
  { name: "Other", slug: "other", icon: "more-horizontal", description: "Other miscellaneous resources" },
  { name: "Lab Manuals", slug: "labs", icon: "flask-conical", description: "Lab manuals, assignments, and lab reports" },
  { name: "Internships & Jobs", slug: "internships", icon: "briefcase", description: "Internship and job opportunities, notices, and career resources" },
  { name: "Research & Journals", slug: "research", icon: "graduation-cap", description: "Research papers, journals, and thesis references" },
  { name: "Competitive Programming", slug: "competitive-programming", icon: "trophy", description: "Contest problems, online judges, and programming practice" },
  { name: "Templates", slug: "templates", icon: "layout-template", description: "CV, cover letter, report, and project templates" },
  { name: "Events & Workshops", slug: "events", icon: "calendar", description: "Workshops, seminars, and campus event resources" },
];

export async function seedResourceCategories() {
  const result = await prisma.resourceCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} resource categories.`);
}

export async function seedResources() {
  await seedResourceCategories();
}
