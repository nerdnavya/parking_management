from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # zone_id -> list of connected websockets (None = global listeners)
        self.active: Dict[str, List[WebSocket]] = {"*": []}

    async def connect(self, ws: WebSocket, zone_id: str = "*"):
        await ws.accept()
        if zone_id not in self.active:
            self.active[zone_id] = []
        self.active[zone_id].append(ws)
        print(f"🔌 WS connected: zone={zone_id} | total={self.total_connections()}")

    def disconnect(self, ws: WebSocket, zone_id: str = "*"):
        self.active.get(zone_id, [])
        try:
            self.active[zone_id].remove(ws)
        except ValueError:
            pass
        print(f"❌ WS disconnected: zone={zone_id} | total={self.total_connections()}")

    async def broadcast_to_zone(self, zone_id: str, payload: dict):
        """Send event to subscribers of a specific zone AND global listeners."""
        message = json.dumps(payload)
        for target in [zone_id, "*"]:
            dead = []
            for ws in self.active.get(target, []):
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active[target].remove(ws)

    async def broadcast_all(self, payload: dict):
        """Broadcast to every connected client."""
        message = json.dumps(payload)
        for zone_id, connections in self.active.items():
            dead = []
            for ws in connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                connections.remove(ws)

    def total_connections(self) -> int:
        return sum(len(v) for v in self.active.values())

manager = ConnectionManager()
