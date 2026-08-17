import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Nightly aggregation, 07:00 UTC — after the 06:00 business-day cut-off.
    { path: "/api/cron/summarize", schedule: "0 7 * * *" },
  ],
};
