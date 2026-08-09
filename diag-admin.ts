import "dotenv/config";
import { adminService } from "./src/app/module/admin/admin.service";

async function run() {
  const tests: Array<[string, () => Promise<unknown>]> = [
    ["getDashboardStats", () => adminService.getDashboardStats()],
    ["getDashboardCharts", () => adminService.getDashboardCharts({ days: 7 })],
    ["listAuditLogs", () => adminService.listAuditLogs({ page: 1, limit: 10 })],
    ["listAlumni", () => adminService.listAlumni({ page: 1, limit: 10 })],
    ["listDiscussions", () => adminService.listDiscussions({ page: 1, limit: 10, sort: "newest" })],
    ["listJobs", () => adminService.listJobs({ page: 1, limit: 10 })],
    ["listUsers", () => adminService.listUsers({ page: 1, limit: 10 })],
  ];

  for (const [name, fn] of tests) {
    try {
      const res = await fn();
      const summary = JSON.stringify(res).slice(0, 200);
      console.log(`\n[OK] ${name} -> ${summary}`);
    } catch (e) {
      console.log(`\n[FAIL] ${name}`);
      console.log("  name:", (e as Error)?.name);
      console.log("  message:", (e as Error)?.message);
      const cause = (e as { cause?: unknown })?.cause;
      if (cause) console.log("  cause:", JSON.stringify(cause).slice(0, 600));
    }
  }
}

run().finally(() => process.exit(0));
