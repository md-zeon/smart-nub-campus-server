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
];

const resources = [
  {
    title: "Data Structure Final Preparation Notes",
    description: "Comprehensive notes covering arrays, linked lists, trees, graphs, and sorting algorithms for CSE-221 final exam preparation.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-dsa-notes.pdf",
    fileType: "application/pdf",
    fileSize: 2450000,
    courseCode: "CSE-221",
    categorySlug: "notes",
    tagSlugs: ["dsa", "linked-list", "tree", "sorting", "data-structures"],
  },
  {
    title: "OOP Lab Manual 2024",
    description: "Complete lab manual with Java examples covering inheritance, polymorphism, encapsulation, and abstraction.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-oop-lab.pdf",
    fileType: "application/pdf",
    fileSize: 1800000,
    courseCode: "CSE-211",
    categorySlug: "notes",
    tagSlugs: ["oop", "java", "inheritance", "polymorphism"],
  },
  {
    title: "DBMS Project Schema Template",
    description: "SQL template for database design projects including ER diagram to schema conversion examples.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-dbms-schema.sql",
    fileType: "application/sql",
    fileSize: 45000,
    courseCode: "CSE-213",
    categorySlug: "code",
    tagSlugs: ["dbms", "sql", "schema-design", "normalization"],
  },
  {
    title: "Operating Systems Cheat Sheet",
    description: "Quick reference for process scheduling algorithms, memory management, and deadlock handling.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-os-cheatsheet.pdf",
    fileType: "application/pdf",
    fileSize: 890000,
    courseCode: "CSE-231",
    categorySlug: "notes",
    tagSlugs: ["os", "process-scheduling", "memory-management"],
  },
  {
    title: "Discrete Mathematics Formula Sheet",
    description: "All important formulas for sets, relations, functions, graph theory, and combinatorics.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-math-formulas.pdf",
    fileType: "application/pdf",
    fileSize: 620000,
    courseCode: "CSE-222",
    categorySlug: "notes",
    tagSlugs: ["algorithms", "data-structures"],
  },
  {
    title: "DSA Algorithm Implementation Collection",
    description: "Python implementations of 50+ common algorithms including sorting, searching, and graph algorithms.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-dsa-code.zip",
    fileType: "application/zip",
    fileSize: 3200000,
    courseCode: "CSE-221",
    categorySlug: "code",
    tagSlugs: ["dsa", "python", "algorithms", "sorting", "graph"],
  },
  {
    title: "DBMS Midterm Past Papers (2019-2023)",
    description: "Collection of 5 years of midterm questions with solutions for CSE-213.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-dbms-pastpapers.pdf",
    fileType: "application/pdf",
    fileSize: 5100000,
    courseCode: "CSE-213",
    categorySlug: "past-papers",
    tagSlugs: ["dbms", "sql"],
  },
  {
    title: "React Hooks Complete Guide",
    description: "Tutorial covering useState, useEffect, useContext, useReducer, and custom hooks with examples.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-react-guide.pdf",
    fileType: "application/pdf",
    fileSize: 1500000,
    courseCode: "CSE-221",
    categorySlug: "slides",
    tagSlugs: ["react", "web-development", "typescript"],
  },
  {
    title: "Operating Systems Past Papers Collection",
    description: "Final and midterm past papers for OS from 2018-2024 with marking schemes.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-os-pastpapers.pdf",
    fileType: "application/pdf",
    fileSize: 4200000,
    courseCode: "CSE-231",
    categorySlug: "past-papers",
    tagSlugs: ["os", "process-scheduling"],
  },
  {
    title: "Java Design Patterns Tutorial",
    description: "Explains 23 GoF design patterns with Java code examples relevant to OOP course.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-java-patterns.pdf",
    fileType: "application/pdf",
    fileSize: 2800000,
    courseCode: "CSE-211",
    categorySlug: "slides",
    tagSlugs: ["java", "oop", "web-development"],
  },
  {
    title: "DSA Tree Traversal Visualization Tool",
    description: "Interactive HTML tool for visualizing BST, AVL, and heap operations.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-tree-tool.zip",
    fileType: "application/zip",
    fileSize: 780000,
    courseCode: "CSE-221",
    categorySlug: "tools",
    tagSlugs: ["dsa", "tree", "binary-search"],
  },
  {
    title: "Database Normalization Step-by-Step Guide",
    description: "Visual guide to 1NF, 2NF, 3NF, and BCNF with real-world examples.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-normalization.pdf",
    fileType: "application/pdf",
    fileSize: 1200000,
    courseCode: "CSE-213",
    categorySlug: "notes",
    tagSlugs: ["dbms", "normalization", "schema-design"],
  },
  {
    title: "Discrete Mathematics Video Lectures",
    description: "Playlist of 20 video lectures covering propositional logic, proofs, and graph theory.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-discrete-math.mp4",
    fileType: "video/mp4",
    fileSize: 150000000,
    courseCode: "CSE-222",
    categorySlug: "videos",
    tagSlugs: ["algorithms"],
  },
  {
    title: "Node.js REST API Starter Template",
    description: "Express.js boilerplate with TypeScript, Prisma, and authentication setup.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-nodejs-starter.zip",
    fileType: "application/zip",
    fileSize: 890000,
    courseCode: "CSE-221",
    categorySlug: "code",
    tagSlugs: ["nodejs", "typescript", "web-development"],
  },
  {
    title: "OS Process Scheduling Simulator",
    description: "Java-based simulator for FCFS, SJF, Round Robin, and Priority scheduling algorithms.",
    fileUrl: "https://res.cloudinary.com/example/raw/upload/v1/sample-os-simulator.zip",
    fileType: "application/zip",
    fileSize: 2100000,
    courseCode: "CSE-231",
    categorySlug: "tools",
    tagSlugs: ["os", "process-scheduling", "java"],
  },
];

export async function seedResources() {
  const existingCount = await prisma.resource.count();
  if (existingCount > 0) {
    console.log("Resources already exist. Skipping resource seed.");
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.error("No admin user found. Run core seed first.");
    return;
  }

  for (const category of categories) {
    await prisma.resourceCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} resource categories.`);

  for (const resource of resources) {
    const course = await prisma.course.findUnique({
      where: { code: resource.courseCode },
    });

    if (!course) {
      console.warn(`Course ${resource.courseCode} not found. Skipping resource: ${resource.title}`);
      continue;
    }

    const category = await prisma.resourceCategory.findUnique({
      where: { slug: resource.categorySlug },
    });

    if (!category) {
      console.warn(`Category ${resource.categorySlug} not found. Skipping resource: ${resource.title}`);
      continue;
    }

    const slug = resource.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await prisma.resource.create({
      data: {
        title: resource.title,
        description: resource.description,
        fileUrl: resource.fileUrl,
        fileType: resource.fileType,
        fileSize: resource.fileSize,
        courseId: course.id,
        categoryId: category.id,
        uploaderId: adminUser.id,
        upvoteCount: Math.floor(Math.random() * 20),
        downloadCount: Math.floor(Math.random() * 50),
        viewCount: Math.floor(Math.random() * 200),
        resourceTags: {
          create: (
            await Promise.all(
              resource.tagSlugs.map(async (tagSlug) => {
                const tag = await prisma.tag.findUnique({
                  where: { slug: tagSlug },
                });
                if (!tag) {
                  console.warn(`Tag ${tagSlug} not found.`);
                  return null;
                }
                return { tagId: tag.id };
              }),
            )
          ).filter(Boolean),
        },
      },
    });
  }

  console.log(`Seeded ${resources.length} resources.`);
}
