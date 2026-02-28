/**
 * Live Synth — Test Runner
 *
 * Wraps Vitest execution for auto-pilot integration.
 * For live-synth, acceptance testing = unit tests (no REST API).
 *
 * Usage:
 *   npx tsx scripts/test-runner.ts           — run all tests
 *   npx tsx scripts/test-runner.ts --watch   — run in watch mode
 */

import { execSync } from "node:child_process";

function main() {
  const args = process.argv.slice(2);
  const watch = args.includes("--watch");

  console.log("\n== Live Synth Test Runner ==\n");

  try {
    // Quality gate: typecheck + lint + test
    console.log("[1/3] TypeScript type check...");
    execSync("pnpm typecheck", { stdio: "inherit" });

    console.log("\n[2/3] Biome lint check...");
    execSync("pnpm lint", { stdio: "inherit" });

    console.log("\n[3/3] Vitest unit tests...");
    const testCmd = watch ? "pnpm test -- --watch" : "pnpm test";
    execSync(testCmd, { stdio: "inherit" });

    console.log("\n" + "=".repeat(50));
    console.log("RESULT: ALL GATES PASSED");
    console.log("=".repeat(50));
    process.exit(0);
  } catch {
    console.error("\n" + "=".repeat(50));
    console.error("RESULT: QUALITY GATE FAILED");
    console.error("=".repeat(50));
    process.exit(1);
  }
}

main();
