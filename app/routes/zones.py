from fastapi import APIRouter, HTTPException
from app.core.database import get_database
from app.models.schemas import SpotStatusUpdate, ZoneStats
from app.services.ws_manager import manager

router = APIRouter()

# ── Zones ──────────────────────────────────────────────────────────────

@router.get("/zones", summary="List all zones with live stats")
async def list_zones():
    db = get_database()
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    result = []
    for z in zones:
        counts = await _get_zone_counts(db, z["zone_id"])
        total = z["total_spots"]
        result.append({
            **z,
            **counts,
            "occupancy_rate": round((counts["occupied"] / total) * 100, 1) if total else 0,
        })
    return result


@router.get("/zones/{zone_id}", summary="Get a single zone with stats")
async def get_zone(zone_id: str):
    db = get_database()
    zone = await db.zones.find_one({"zone_id": zone_id.upper()}, {"_id": 0})
    if not zone:
        raise HTTPException(404, f"Zone {zone_id} not found")
    counts = await _get_zone_counts(db, zone["zone_id"])
    total = zone["total_spots"]
    return {
        **zone,
        **counts,
        "occupancy_rate": round((counts["occupied"] / total) * 100, 1) if total else 0,
    }


# ── Spots ──────────────────────────────────────────────────────────────

@router.get("/zones/{zone_id}/spots", summary="Get all spots in a zone")
async def get_spots(zone_id: str, status: str = None, type: str = None):
    db = get_database()
    query = {"zone_id": zone_id.upper()}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    spots = await db.spots.find(query, {"_id": 0}).to_list(200)
    return spots


@router.patch("/spots/{spot_id}", summary="Update spot status (IoT sensor endpoint)")
async def update_spot_status(spot_id: str, body: SpotStatusUpdate):
    db = get_database()
    spot = await db.spots.find_one({"spot_id": spot_id})
    if not spot:
        raise HTTPException(404, f"Spot {spot_id} not found")

    await db.spots.update_one({"spot_id": spot_id}, {"$set": {"status": body.status}})

    updated = {**spot, "status": body.status}
    updated.pop("_id", None)

    # Broadcast real-time update
    await manager.broadcast_to_zone(spot["zone_id"], {
        "event": "spot_update",
        "zone_id": spot["zone_id"],
        "data": updated,
    })

    # Also broadcast refreshed zone stats
    counts = await _get_zone_counts(db, spot["zone_id"])
    zone = await db.zones.find_one({"zone_id": spot["zone_id"]}, {"_id": 0})
    total = zone["total_spots"]
    await manager.broadcast_to_zone(spot["zone_id"], {
        "event": "zone_stats",
        "zone_id": spot["zone_id"],
        "data": {**zone, **counts, "occupancy_rate": round((counts["occupied"] / total) * 100, 1)},
    })

    return updated


# ── Helpers ────────────────────────────────────────────────────────────

async def _get_zone_counts(db, zone_id: str) -> dict:
    pipeline = [
        {"$match": {"zone_id": zone_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    rows = await db.spots.aggregate(pipeline).to_list(10)
    counts = {r["_id"]: r["count"] for r in rows}
    return {
        "free":     counts.get("free", 0),
        "occupied": counts.get("occupied", 0),
        "reserved": counts.get("reserved", 0),
    }
