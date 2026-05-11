from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

def get_database():
    return client[settings.DATABASE_NAME]

async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = get_database()

    # Create indexes
    await db.zones.create_index("zone_id", unique=True)
    await db.spots.create_index([("zone_id", 1), ("spot_id", 1)], unique=True)
    await db.bookings.create_index("booking_id", unique=True)
    await db.bookings.create_index("user_id")
    await db.bookings.create_index("spot_id")

    # Seed initial data if empty
    if await db.zones.count_documents({}) == 0:
        await seed_data(db)

    print("✅ Connected to MongoDB")

async def disconnect_db():
    global client
    if client:
        client.close()
        print("🔌 Disconnected from MongoDB")

async def seed_data(db):
    zones = [
        {"zone_id": "A", "name": "Zone A — Central Market", "total_spots": 12, "price_per_hour": 30, "lat": 28.61, "lng": 77.20},
        {"zone_id": "B", "name": "Zone B — Tech Park",      "total_spots": 20, "price_per_hour": 20, "lat": 28.62, "lng": 77.21},
        {"zone_id": "C", "name": "Zone C — Hospital",       "total_spots": 8,  "price_per_hour": 15, "lat": 28.60, "lng": 77.19},
        {"zone_id": "D", "name": "Zone D — Stadium",        "total_spots": 16, "price_per_hour": 25, "lat": 28.63, "lng": 77.22},
    ]
    await db.zones.insert_many(zones)

    spot_types = {0: "EV", 1: "Handicap"}  # every 5th=EV, every 7th=Handicap
    spots = []
    for zone in zones:
        for i in range(zone["total_spots"]):
            spot_type = "EV" if i % 5 == 0 else "Handicap" if i % 7 == 0 else "Standard"
            spots.append({
                "spot_id": f"{zone['zone_id']}{i+1}",
                "zone_id": zone["zone_id"],
                "type": spot_type,
                "status": "free",  # free | occupied | reserved
                "price_per_hour": zone["price_per_hour"],
            })
    await db.spots.insert_many(spots)
    print("🌱 Seeded initial zone and spot data")
