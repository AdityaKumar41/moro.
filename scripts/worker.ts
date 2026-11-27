import { workOnce, sendNotifications } from "../lib/worker";
const single = process.argv.includes("--once");
async function main() {
  do {
    const worked = await workOnce();
    await sendNotifications();
    if (single) break;
    if (!worked) await new Promise((r) => setTimeout(r, 3000));
  } while (true);
}
main().catch((e) => {
  console.error("Worker stopped:", e.message);
  process.exitCode = 1;
});
