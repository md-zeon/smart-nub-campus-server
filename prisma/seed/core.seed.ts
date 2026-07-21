import { prisma } from "../../src/app/lib/prisma";
import { auth } from "../../src/app/lib/auth";
import { UserRole } from "../../src/generated/prisma/enums";

export async function seedCore() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@nub.ac.bd";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345678";
  const adminName = process.env.SEED_ADMIN_NAME || "System Administrator";
  const designation = process.env.SEED_ADMIN_DESIGNATION || "System Admin";

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log("Admin user already exists. Skipping core seed.");
    return;
  }

  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  if (!signUpResult || !("user" in signUpResult) || !signUpResult.user) {
    console.error("Failed to create admin user");
    throw new Error("Failed to create admin user");
  }

  const authUser = signUpResult.user;

  await prisma.user.update({
    where: { id: authUser.id },
    data: { emailVerified: true },
  });

  await prisma.admin.create({
    data: {
      userId: authUser.id,
      designation,
    },
  });

  console.log(`Admin user created: ${adminEmail}`);
}
