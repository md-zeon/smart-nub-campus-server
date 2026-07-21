import { prisma } from "../src/app/lib/prisma";
import { seedCore } from "./seed/core.seed";
import { seedAcademic } from "./seed/academic.seed";

async function main() {
  await seedCore();
  await seedAcademic();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
