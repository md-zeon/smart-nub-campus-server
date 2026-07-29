import { prisma } from "../../src/app/lib/prisma";

const sampleEvents = [
  {
    title: "Campus Welcome Week 2026",
    description:
      "Kick off the new semester with a week of fun activities, club fairs, and networking events. Meet fellow students and discover what NUB has to offer.",
    eventDate: new Date("2026-08-15T09:00:00Z"),
    location: "NUB Main Campus, Auditorium",
    imageUrl: "https://res.cloudinary.com/example/image/upload/welcome-week.jpg",
    status: "UPCOMING" as const,
    isFeatured: true,
  },
  {
    title: "Tech Talk: AI in 2026",
    description:
      "Join industry experts as they discuss the latest advancements in artificial intelligence and how they impact the tech landscape.",
    eventDate: new Date("2026-08-25T14:00:00Z"),
    location: "CSE Building, Room 301",
    imageUrl: "https://res.cloudinary.com/example/image/upload/ai-tech-talk.jpg",
    status: "UPCOMING" as const,
    isFeatured: false,
  },
  {
    title: "Annual Career Fair",
    description:
      "Connect with top employers looking to hire NUB graduates. Bring your resume and dress to impress.",
    eventDate: new Date("2026-09-01T10:00:00Z"),
    location: "Student Center, Hall A",
    imageUrl: "https://res.cloudinary.com/example/image/upload/career-fair.jpg",
    status: "UPCOMING" as const,
    isFeatured: true,
  },
  {
    title: "Hackathon 2026",
    description:
      "48-hour coding marathon. Build innovative solutions, win prizes, and have fun with your team.",
    eventDate: new Date("2026-07-10T08:00:00Z"),
    location: "Innovation Lab",
    imageUrl: "https://res.cloudinary.com/example/image/upload/hackathon.jpg",
    status: "COMPLETED" as const,
    isFeatured: false,
  },
  {
    title: "Guest Lecture: Cloud Computing",
    description:
      "A deep dive into modern cloud infrastructure and deployment strategies.",
    eventDate: new Date("2026-07-20T15:00:00Z"),
    location: "Online (Zoom)",
    status: "CANCELLED" as const,
    isFeatured: false,
  },
];

export async function seedEvents() {
  const existingCount = await prisma.event.count();
  if (existingCount > 0) {
    console.log("Events already exist. Skipping event seed.");
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.error("No admin user found. Run core seed first.");
    return;
  }

  for (const event of sampleEvents) {
    await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        eventDate: event.eventDate,
        location: event.location ?? null,
        imageUrl: event.imageUrl ?? null,
        organizerId: adminUser.id,
        status: event.status,
        isFeatured: event.isFeatured,
      },
    });
  }

  console.log(`Seeded ${sampleEvents.length} events.`);
}
