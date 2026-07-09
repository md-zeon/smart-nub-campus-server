import { prisma } from "../src/app/lib/prisma";
import { auth } from "../src/app/lib/auth";
import { UserRole } from "../src/generated/prisma/enums";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@nub.ac.bd";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345678";
  const adminName = process.env.SEED_ADMIN_NAME || "System Administrator";
  const designation = process.env.SEED_ADMIN_DESIGNATION || "System Admin";

  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  // Create admin user via Better Auth
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Better Auth returns user directly on success, or an error object on failure
  if (!signUpResult || !("user" in signUpResult) || !signUpResult.user) {
    console.error("Failed to create admin user");
    throw new Error("Failed to create admin user");
  }

  const authUser = signUpResult.user;

  // Set emailVerified to true for admin users (they are pre-verified)
  await prisma.user.update({
    where: { id: authUser.id },
    data: { emailVerified: true },
  });

  // Create admin record
  await prisma.admin.create({
    data: {
      userId: authUser.id,
      designation,
    },
  });

  console.log(`Admin user created: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
