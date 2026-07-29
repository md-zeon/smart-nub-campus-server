import { prisma } from "../../src/app/lib/prisma";

const badgeDefinitions = [
  // CONTRIBUTION category
  {
    name: "First Upload",
    description: "Upload your first resource to the campus library.",
    icon: "upload-bronze",
    category: "CONTRIBUTION",
    tier: "BRONZE",
    points: 5,
    condition: "resources_uploaded:1",
  },
  {
    name: "Prolific Uploader",
    description: "Upload 10 resources to help fellow students.",
    icon: "upload-silver",
    category: "CONTRIBUTION",
    tier: "SILVER",
    points: 25,
    condition: "resources_uploaded:10",
  },
  {
    name: "Resource Champion",
    description: "Upload 50 resources and become a campus knowledge hub.",
    icon: "upload-gold",
    category: "CONTRIBUTION",
    tier: "GOLD",
    points: 100,
    condition: "resources_uploaded:50",
  },
  {
    name: "Campus Librarian",
    description: "Upload 100 resources. You are the backbone of campus knowledge.",
    icon: "upload-platinum",
    category: "CONTRIBUTION",
    tier: "PLATINUM",
    points: 250,
    condition: "resources_uploaded:100",
  },

  // COMMUNITY category
  {
    name: "Discussion Starter",
    description: "Start your first discussion on campus.",
    icon: "discussion-bronze",
    category: "COMMUNITY",
    tier: "BRONZE",
    points: 5,
    condition: "discussions_created:1",
  },
  {
    name: "Conversation Maker",
    description: "Start 10 discussions and spark campus conversations.",
    icon: "discussion-silver",
    category: "COMMUNITY",
    tier: "SILVER",
    points: 20,
    condition: "discussions_created:10",
  },
  {
    name: "Helpful Answerer",
    description: "Get 5 answers accepted by the community.",
    icon: "answer-silver",
    category: "COMMUNITY",
    tier: "SILVER",
    points: 30,
    condition: "answers_accepted:5",
  },
  {
    name: "Q&A Expert",
    description: "Get 25 answers accepted. You are a trusted problem solver.",
    icon: "answer-gold",
    category: "COMMUNITY",
    tier: "GOLD",
    points: 75,
    condition: "answers_accepted:25",
  },

  // ACADEMIC category
  {
    name: "Curious Mind",
    description: "Ask your first question on campus Q&A.",
    icon: "question-bronze",
    category: "ACADEMIC",
    tier: "BRONZE",
    points: 3,
    condition: "questions_asked:1",
  },
  {
    name: "Knowledge Seeker",
    description: "Ask 10 questions and deepen your understanding.",
    icon: "question-silver",
    category: "ACADEMIC",
    tier: "SILVER",
    points: 15,
    condition: "questions_asked:10",
  },
  {
    name: "Scholar",
    description: "Ask 50 questions. Your curiosity knows no bounds.",
    icon: "question-gold",
    category: "ACADEMIC",
    tier: "GOLD",
    points: 50,
    condition: "questions_asked:50",
  },

  // REPUTATION category
  {
    name: "Rising Star",
    description: "Earn 50 reputation points through campus contributions.",
    icon: "reputation-bronze",
    category: "REPUTATION",
    tier: "BRONZE",
    points: 10,
    condition: "total_points:50",
  },
  {
    name: "Campus Influencer",
    description: "Earn 200 reputation points and influence campus culture.",
    icon: "reputation-silver",
    category: "REPUTATION",
    tier: "SILVER",
    points: 30,
    condition: "total_points:200",
  },
  {
    name: "Top Contributor",
    description: "Earn 500 reputation points. You are a campus legend.",
    icon: "reputation-gold",
    category: "REPUTATION",
    tier: "GOLD",
    points: 100,
    condition: "total_points:500",
  },
  {
    name: "Campus Elite",
    description: "Earn 1000 reputation points. The pinnacle of campus achievement.",
    icon: "reputation-platinum",
    category: "REPUTATION",
    tier: "PLATINUM",
    points: 250,
    condition: "total_points:1000",
  },

  // NETWORKING category (milestone-based, condition always true for now)
  {
    name: "Connector",
    description: "Send your first connection request.",
    icon: "network-bronze",
    category: "NETWORKING",
    tier: "BRONZE",
    points: 5,
    condition: "total_points:0",
  },

  // MILESTONES category
  {
    name: "Profile Pro",
    description: "Complete your campus profile.",
    icon: "profile-bronze",
    category: "MILESTONES",
    tier: "BRONZE",
    points: 5,
    condition: "total_points:0",
  },
  {
    name: "Campus Pioneer",
    description: "Be among the first to explore the campus platform.",
    icon: "pioneer-silver",
    category: "MILESTONES",
    tier: "SILVER",
    points: 15,
    condition: "total_points:0",
  },
];

export async function seedBadges() {
  const existingCount = await prisma.badge.count();
  if (existingCount > 0) {
    console.log("Badges already exist. Skipping badge seed.");
    return;
  }

  for (const badge of badgeDefinitions) {
    await prisma.badge.create({
      data: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category as never,
        tier: badge.tier as never,
        points: badge.points,
        condition: badge.condition,
      },
    });
  }

  console.log(`Seeded ${badgeDefinitions.length} badges.`);
}
