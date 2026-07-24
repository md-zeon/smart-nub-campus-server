import { prisma } from "../../src/app/lib/prisma";

const tags = [
  { name: "DSA", slug: "dsa" },
  { name: "Linked List", slug: "linked-list" },
  { name: "Tree", slug: "tree" },
  { name: "Sorting", slug: "sorting" },
  { name: "Graph", slug: "graph" },
  { name: "Binary Search", slug: "binary-search" },
  { name: "Recursion", slug: "recursion" },
  { name: "Dynamic Programming", slug: "dynamic-programming" },
  { name: "OOP", slug: "oop" },
  { name: "Java", slug: "java" },
  { name: "Inheritance", slug: "inheritance" },
  { name: "Polymorphism", slug: "polymorphism" },
  { name: "DBMS", slug: "dbms" },
  { name: "SQL", slug: "sql" },
  { name: "Schema Design", slug: "schema-design" },
  { name: "Normalization", slug: "normalization" },
  { name: "OS", slug: "os" },
  { name: "Process Scheduling", slug: "process-scheduling" },
  { name: "Memory Management", slug: "memory-management" },
  { name: "React", slug: "react" },
  { name: "Node.js", slug: "nodejs" },
  { name: "Python", slug: "python" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Machine Learning", slug: "machine-learning" },
  { name: "Data Science", slug: "data-science" },
  { name: "Networking", slug: "networking" },
  { name: "Cyber Security", slug: "cyber-security" },
  { name: "Algorithms", slug: "algorithms" },
  { name: "Data Structures", slug: "data-structures" },
  { name: "Web Development", slug: "web-development" },
  { name: "Mobile Development", slug: "mobile-development" },
  { name: "Cloud Computing", slug: "cloud-computing" },
  { name: "DevOps", slug: "devops" },
  { name: "Git", slug: "git" },
  { name: "Linux", slug: "linux" },
  { name: "Compiler Design", slug: "compiler-design" },
  { name: "Artificial Intelligence", slug: "artificial-intelligence" },
  { name: "Statistics", slug: "statistics" },
  { name: "Linear Algebra", slug: "linear-algebra" },
  { name: "Calculus", slug: "calculus" },
  { name: "Physics", slug: "physics" },
  { name: "Chemistry", slug: "chemistry" },
  { name: "Economics", slug: "economics" },
  { name: "Business", slug: "business" },
  { name: "Marketing", slug: "marketing" },
  { name: "Finance", slug: "finance" },
  { name: "HR Management", slug: "hr-management" },
];

export async function seedNetwork() {
  const existingCount = await prisma.tag.count();
  if (existingCount > 0) {
    console.log("Tags already exist. Skipping network seed.");
    return;
  }

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  console.log(`Seeded ${tags.length} tags.`);
}
