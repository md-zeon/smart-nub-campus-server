import { prisma } from "../../src/app/lib/prisma";

const tags = [
  { name: "DSA", slug: "dsa" },
  { name: "OOP", slug: "oop" },
  { name: "DBMS", slug: "dbms" },
  { name: "SQL", slug: "sql" },
  { name: "OS", slug: "os" },
  { name: "Networking", slug: "networking" },
  { name: "C", slug: "c" },
  { name: "C++", slug: "c++" },
  { name: "Java", slug: "java" },
  { name: "Python", slug: "python" },
  { name: "JavaScript", slug: "javascript" },
  { name: "TypeScript", slug: "typescript" },
  { name: "React", slug: "react" },
  { name: "Node.js", slug: "nodejs" },
  { name: "Express", slug: "express" },
  { name: "Next.js", slug: "nextjs" },
  { name: "Tailwind CSS", slug: "tailwind-css" },
  { name: "MongoDB", slug: "mongodb" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "Git", slug: "git" },
  { name: "Docker", slug: "docker" },
  { name: "Linux", slug: "linux" },
  { name: "DevOps", slug: "devops" },
  { name: "Cloud Computing", slug: "cloud-computing" },
  { name: "Web Development", slug: "web-development" },
  { name: "Mobile Development", slug: "mobile-development" },
  { name: "Machine Learning", slug: "machine-learning" },
  { name: "Artificial Intelligence", slug: "artificial-intelligence" },
  { name: "Data Science", slug: "data-science" },
  { name: "Cyber Security", slug: "cyber-security" },
  { name: "MATLAB", slug: "matlab" },
  { name: "Arduino", slug: "arduino" },
];

export async function seedNetwork() {
  const result = await prisma.tag.createMany({
    data: tags,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} tags.`);
}
