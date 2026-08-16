import { prisma } from "../../src/app/lib/prisma";

const badgeDefinitions = [
  // CONTRIBUTION category
  {
    name: "First Upload",
    description: "Upload your first resource to the campus library.",
    icon: "upload-cloud",
    category: "CONTRIBUTION",
    tier: "BRONZE",
    points: 5,
    condition: "resources_uploaded:1",
  },
  {
    name: "Prolific Uploader",
    description: "Upload 10 resources to help fellow students.",
    icon: "folder-up",
    category: "CONTRIBUTION",
    tier: "SILVER",
    points: 25,
    condition: "resources_uploaded:10",
  },
  {
    name: "Resource Champion",
    description: "Upload 50 resources and become a campus knowledge hub.",
    icon: "library-big",
    category: "CONTRIBUTION",
    tier: "GOLD",
    points: 100,
    condition: "resources_uploaded:50",
  },
  {
    name: "Campus Librarian",
    description: "Upload 100 resources. You are the backbone of campus knowledge.",
    icon: "book-marked",
    category: "CONTRIBUTION",
    tier: "PLATINUM",
    points: 250,
    condition: "resources_uploaded:100",
  },

  // COMMUNITY category
  {
    name: "Discussion Starter",
    description: "Start your first discussion on campus.",
    icon: "message-square",
    category: "COMMUNITY",
    tier: "BRONZE",
    points: 5,
    condition: "discussions_created:1",
  },
  {
    name: "Conversation Maker",
    description: "Start 10 discussions and spark campus conversations.",
    icon: "messages-square",
    category: "COMMUNITY",
    tier: "SILVER",
    points: 20,
    condition: "discussions_created:10",
  },
  {
    name: "Helpful Answerer",
    description: "Get 5 answers accepted by the community.",
    icon: "badge-check",
    category: "COMMUNITY",
    tier: "SILVER",
    points: 30,
    condition: "answers_accepted:5",
  },
  {
    name: "Q&A Expert",
    description: "Get 25 answers accepted. You are a trusted problem solver.",
    icon: "lightbulb",
    category: "COMMUNITY",
    tier: "GOLD",
    points: 75,
    condition: "answers_accepted:25",
  },

  // ACADEMIC category
  {
    name: "Curious Mind",
    description: "Ask your first question on campus Q&A.",
    icon: "help-circle",
    category: "ACADEMIC",
    tier: "BRONZE",
    points: 3,
    condition: "questions_asked:1",
  },
  {
    name: "Knowledge Seeker",
    description: "Ask 10 questions and deepen your understanding.",
    icon: "book-open",
    category: "ACADEMIC",
    tier: "SILVER",
    points: 15,
    condition: "questions_asked:10",
  },
  {
    name: "Scholar",
    description: "Ask 50 questions. Your curiosity knows no bounds.",
    icon: "graduation-cap",
    category: "ACADEMIC",
    tier: "GOLD",
    points: 50,
    condition: "questions_asked:50",
  },

  // REPUTATION category
  {
    name: "Rising Star",
    description: "Earn 50 reputation points through campus contributions.",
    icon: "star",
    category: "REPUTATION",
    tier: "BRONZE",
    points: 10,
    condition: "total_points:50",
  },
  {
    name: "Campus Influencer",
    description: "Earn 200 reputation points and influence campus culture.",
    icon: "megaphone",
    category: "REPUTATION",
    tier: "SILVER",
    points: 30,
    condition: "total_points:200",
  },
  {
    name: "Top Contributor",
    description: "Earn 500 reputation points. You are a campus legend.",
    icon: "trophy",
    category: "REPUTATION",
    tier: "GOLD",
    points: 100,
    condition: "total_points:500",
  },
  {
    name: "Campus Elite",
    description: "Earn 1000 reputation points. The pinnacle of campus achievement.",
    icon: "gem",
    category: "REPUTATION",
    tier: "PLATINUM",
    points: 250,
    condition: "total_points:1000",
  },

  // NETWORKING category (milestone-based, condition always true for now)
  {
    name: "Connector",
    description: "Send your first connection request.",
    icon: "user-plus",
    category: "NETWORKING",
    tier: "BRONZE",
    points: 5,
    condition: "total_points:0",
  },

  // MILESTONES category
  {
    name: "Profile Pro",
    description: "Complete your campus profile.",
    icon: "user-round-check",
    category: "MILESTONES",
    tier: "BRONZE",
    points: 5,
    condition: "total_points:0",
  },
  {
    name: "Campus Pioneer",
    description: "Be among the first to explore the campus platform.",
    icon: "rocket",
    category: "MILESTONES",
    tier: "SILVER",
    points: 15,
    condition: "total_points:0",
  },

  // ALUMNI milestones
  {
    name: "Alumnus",
    description: "Officially joined the alumni community after graduating from NUB.",
    icon: "graduation-cap",
    category: "MILESTONES",
    tier: "SILVER",
    points: 20,
    condition: "total_points:0",
  },
  {
    name: "Mentor",
    description: "Opened up to mentor current students and guide the next generation.",
    icon: "users",
    category: "NETWORKING",
    tier: "SILVER",
    points: 15,
    condition: "total_points:0",
  },
  {
    name: "Job Pioneer",
    description: "Posted the first job opportunity for the campus community.",
    icon: "briefcase",
    category: "CONTRIBUTION",
    tier: "BRONZE",
    points: 10,
    condition: "jobs_posted:1",
  },
];

export async function seedBadges() {
  const result = await prisma.badge.createMany({
    data: badgeDefinitions.map((badge) => ({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category as never,
      tier: badge.tier as never,
      points: badge.points,
      condition: badge.condition,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} badges.`);
}
