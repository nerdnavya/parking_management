from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

# ── Zone ──────────────────────────────────────────────
class Zone(BaseModel):
    zone_id: str
    name: str
    total_spots: int
    price_per_hour: float
    lat: float
    lng: float

class ZoneStats(Zone):
    free: int
    occupied: int
    reserved: int
    occupancy_rate: float

# ── Spot ──────────────────────────────────────────────
SpotStatus = Literal["free", "occupied", "reserved"]
SpotType   = Literal["Standard", "EV", "Handicap"]

class Spot(BaseModel):
    spot_id: str
    zone_id: str
    type: SpotType
    status: SpotStatus
    price_per_hour: float

class SpotStatusUpdate(BaseModel):
    status: SpotStatus

# ── Booking ───────────────────────────────────────────
class BookingCreate(BaseModel):
    spot_id: str
    zone_id: str
    user_id: str
    duration_hours: float = Field(gt=0, le=24)

class Booking(BaseModel):
    booking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    spot_id: str
    zone_id: str
    user_id: str
    duration_hours: float
    total_price: float
    status: Literal["active", "completed", "cancelled"] = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class BookingResponse(Booking):
    pass

# ── WebSocket event ───────────────────────────────────
class WSEvent(BaseModel):
    event: str          # spot_update | booking_created | zone_stats
    zone_id: Optional[str] = None
    data: dict
