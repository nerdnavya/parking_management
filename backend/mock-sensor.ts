/**
 * ParkMind — Mock IoT Sensor Simulator
 *
 * Simulates real-time spot status changes so the occupancy panel
 * looks alive during a hackathon demo. Runs as a long-lived process.
 *
 * Usage:
 *   npx tsx backend/mock-sensor.ts
 *
 * What it does every 30 seconds:
 *  - Picks 2–5 random "free" spots and marks them "occupied"
 *  - Picks 2–5 random "occupied" spots and marks them "free"
 *  - Logs a compact diff to the console
 *
 * Stop with Ctrl+C.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INTERVAL_MS  = 30_000; // 30 seconds

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function tick() {
  const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });

  // Fetch current free and occupied spots (exclude EV spots so they stay as EV)
  const { data: freeSpots }     = await admin.from("spots").select("id,code,lot_id").eq("status", "free");
  const { data: occupiedSpots } = await admin.from("spots").select("id,code,lot_id").eq("status", "occupied");

  if (!freeSpots?.length && !occupiedSpots?.length) {
    console.log(`[${timestamp}] No spots found — is the seed run yet?`);
    return;
  }

  // Randomly occupy some free spots
  const toOccupy = pick(freeSpots ?? [], randInt(2, 5));
  // Randomly free some occupied spots
  const toFree   = pick(occupiedSpots ?? [], randInt(2, 5));

  const occupyIds = toOccupy.map(s => s.id);
  const freeIds   = toFree.map(s => s.id);

  if (occupyIds.length) {
    await admin.from("spots").update({ status: "occupied" }).in("id", occupyIds);
  }
  if (freeIds.length) {
    await admin.from("spots").update({ status: "free" }).in("id", freeIds);
  }

  console.log(
    `[${timestamp}] 🚗  +${toOccupy.length} occupied (${toOccupy.map(s => s.code).join(", ")})` +
    `  |  ✅  +${toFree.length} freed (${toFree.map(s => s.code).join(", ")})`
  );
}

// ─── Main loop ────────────────────────────────────────────────────────────────

console.log("🔄  ParkMind Mock Sensor running — press Ctrl+C to stop");
console.log(`    Updating spot statuses every ${INTERVAL_MS / 1000}s\n`);

tick(); // run immediately on start
const timer = setInterval(tick, INTERVAL_MS);

// Graceful shutdown
process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("\n🛑  Sensor simulator stopped.");
  process.exit(0);
});
