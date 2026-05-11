/**
 * ParkMind — Seed Script
 * Populates Supabase with parking lots, spots, and sample events.
 *
 * Usage:
 *   npx tsx backend/seed.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Seed data ────────────────────────────────────────────────────────────────

const LOTS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Forum Mall Basement",
    area: "Koramangala",
    lat: 12.9345, lng: 77.6118,
    total_spots: 40, base_price_inr: 60, walking_minutes_to_landmark: 3,
    description: "Covered basement, CCTV, lift access",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "80ft Road Open Lot",
    area: "Koramangala",
    lat: 12.9352, lng: 77.6240,
    total_spots: 30, base_price_inr: 40, walking_minutes_to_landmark: 7,
    description: "Open lot near 80ft Rd cafés",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Sony Signal Multilevel",
    area: "Koramangala",
    lat: 12.9311, lng: 77.6196,
    total_spots: 25, base_price_inr: 80, walking_minutes_to_landmark: 2,
    description: "Multilevel structure with EV bays",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Indiranagar 100ft",
    area: "Indiranagar",
    lat: 12.9716, lng: 77.6411,
    total_spots: 30, base_price_inr: 90, walking_minutes_to_landmark: 4,
    description: "Premium location, busy weekends",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "HSR 27th Main",
    area: "HSR Layout",
    lat: 12.9116, lng: 77.6446,
    total_spots: 20, base_price_inr: 50, walking_minutes_to_landmark: 8,
    description: "Quiet residential perimeter",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    name: "Stadium Side Lot",
    area: "Koramangala",
    lat: 12.9290, lng: 77.6140,
    total_spots: 15, base_price_inr: 120, walking_minutes_to_landmark: 10,
    description: "Right next to Chinnaswamy approach",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    name: "MG Road Parkade",
    area: "MG Road",
    lat: 12.9766, lng: 77.6099,
    total_spots: 50, base_price_inr: 70, walking_minutes_to_landmark: 2,
    description: "Central multilevel, near metro",
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    name: "Whitefield IT Park Annex",
    area: "Whitefield",
    lat: 12.9698, lng: 77.7499,
    total_spots: 60, base_price_inr: 30, walking_minutes_to_landmark: 12,
    description: "Large lot serving tech campus overflow",
  },
];

// Events scheduled relative to now so they're always upcoming during a demo
const now = new Date();
const h = (n: number) => new Date(now.getTime() + n * 3_600_000).toISOString();

const EVENTS = [
  {
    title: "IPL Cricket: RCB vs MI",
    venue: "Chinnaswamy Stadium",
    area: "Koramangala",
    starts_at: h(4), ends_at: h(8),
    expected_attendance: 38_000,
  },
  {
    title: "Indie Night Live",
    venue: "Forum Mall",
    area: "Koramangala",
    starts_at: h(6), ends_at: h(10),
    expected_attendance: 1_200,
  },
  {
    title: "Bengaluru Tech Meetup",
    venue: "Indiranagar Social",
    area: "Indiranagar",
    starts_at: h(2), ends_at: h(5),
    expected_attendance: 300,
  },
  {
    title: "Whitefield Startup Demo Day",
    venue: "ITPB Convention Centre",
    area: "Whitefield",
    starts_at: h(1), ends_at: h(4),
    expected_attendance: 800,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SpotStatus = "free" | "occupied" | "reserved" | "ev";

function spotsForLot(lotId: string, total: number) {
  const rows = [];
  for (let i = 1; i <= total; i++) {
    const isEv = i % 8 === 0;
    let status: SpotStatus;
    if (isEv)       status = "ev";
    else if (i % 4 === 0) status = "occupied";
    else if (i % 7 === 0) status = "reserved";
    else            status = "free";
    rows.push({ lot_id: lotId, code: `S${String(i).padStart(2, "0")}`, status, is_ev: isEv });
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱  Seeding ParkMind database...\n");

  // 1. Upsert lots
  console.log("  📍  Upserting lots...");
  const { error: lotErr } = await admin.from("lots").upsert(LOTS, { onConflict: "id" });
  if (lotErr) throw new Error(`Lots: ${lotErr.message}`);
  console.log(`      ✓ ${LOTS.length} lots`);

  // 2. Upsert spots for each lot (skip if already exist)
  console.log("  🅿️   Upserting spots...");
  let totalSpots = 0;
  for (const lot of LOTS) {
    const spots = spotsForLot(lot.id, lot.total_spots);
    const { error } = await admin.from("spots").upsert(spots, { onConflict: "lot_id,code" });
    if (error) throw new Error(`Spots for ${lot.name}: ${error.message}`);
    totalSpots += spots.length;
  }
  console.log(`      ✓ ${totalSpots} spots`);

  // 3. Delete old seeded events and re-insert fresh ones (so times are always future)
  console.log("  📅  Refreshing events...");
  await admin.from("events").delete().in("title", EVENTS.map(e => e.title));
  const { error: evErr } = await admin.from("events").insert(EVENTS);
  if (evErr) throw new Error(`Events: ${evErr.message}`);
  console.log(`      ✓ ${EVENTS.length} events`);

  console.log("\n✅  Seed complete! Your database is ready.");
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
