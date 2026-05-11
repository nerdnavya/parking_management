from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from app.core.database import get_database
from app.models.schemas import BookingCreate, Booking
from app.services.ws_manager import manager
import uuid

router = APIRouter()


@router.post("/bookings", summary="Create a booking (reserves a spot)")
async def create_booking(body: BookingCreate):
    db = get_database()

    # Check spot exists and is free
    spot = await db.spots.find_one({"spot_id": body.spot_id, "zone_id": body.zone_id.upper()})
    if not spot:
        raise HTTPException(404, "Spot not found")
    if spot["status"] != "free":
        raise HTTPException(409, f"Spot {body.spot_id} is currently {spot['status']}")

    # Create booking document
    now = datetime.utcnow()
    booking = {
        "booking_id": str(uuid.uuid4()),
        "spot_id": body.spot_id,
        "zone_id": body.zone_id.upper(),
        "user_id": body.user_id,
        "duration_hours": body.duration_hours,
        "total_price": round(spot["price_per_hour"] * body.duration_hours, 2),
        "status": "active",
        "created_at": now,
        "expires_at": now + timedelta(hours=body.duration_hours),
    }
    await db.bookings.insert_one(booking)

    # Mark spot as reserved
    await db.spots.update_one({"spot_id": body.spot_id}, {"$set": {"status": "reserved"}})

    booking.pop("_id", None)

    # Broadcast spot update via WebSocket
    spot_updated = {**spot, "status": "reserved"}
    spot_updated.pop("_id", None)
    await manager.broadcast_to_zone(body.zone_id.upper(), {
        "event": "spot_update",
        "zone_id": body.zone_id.upper(),
        "data": spot_updated,
    })
    await manager.broadcast_to_zone(body.zone_id.upper(), {
        "event": "booking_created",
        "zone_id": body.zone_id.upper(),
        "data": {k: str(v) if isinstance(v, datetime) else v for k, v in booking.items()},
    })

    return {k: str(v) if isinstance(v, datetime) else v for k, v in booking.items()}


@router.get("/bookings/{booking_id}", summary="Get booking details")
async def get_booking(booking_id: str):
    db = get_database()
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")
    return {k: str(v) if isinstance(v, datetime) else v for k, v in booking.items()}


@router.get("/users/{user_id}/bookings", summary="Get all bookings for a user")
async def get_user_bookings(user_id: str, status: str = None):
    db = get_database()
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [{k: str(v) if isinstance(v, datetime) else v for k, v in b.items()} for b in bookings]


@router.patch("/bookings/{booking_id}/cancel", summary="Cancel a booking")
async def cancel_booking(booking_id: str):
    db = get_database()
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking["status"] != "active":
        raise HTTPException(400, f"Booking is already {booking['status']}")

    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": "cancelled"}})
    await db.spots.update_one({"spot_id": booking["spot_id"]}, {"$set": {"status": "free"}})

    # Broadcast freed spot
    spot = await db.spots.find_one({"spot_id": booking["spot_id"]}, {"_id": 0})
    await manager.broadcast_to_zone(booking["zone_id"], {
        "event": "spot_update",
        "zone_id": booking["zone_id"],
        "data": {**spot, "status": "free"},
    })

    return {"message": "Booking cancelled", "booking_id": booking_id}
