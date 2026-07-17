import { prisma } from "../src/app/lib/prisma";
import { seedCore } from "./seed/core.seed";
import { seedAcademic } from "./seed/academic.seed";
import { seedNetwork } from "./seed/network.seed";
import { seedResources } from "./seed/resource.seed";
import { seedDiscussions } from "./seed/discussion.seed";
import { seedQA } from "./seed/qa.seed";

async function main() {
  await seedCore();
  await seedAcademic();
  await seedNetwork();
  await seedResources();
  await seedDiscussions();
  await seedQA();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
