from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_global(ws: WebSocket):
    """Global listener — receives updates from ALL zones."""
    await manager.connect(ws, zone_id="*")
    try:
        while True:
            # Keep alive; client can send ping
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws, zone_id="*")


@router.websocket("/ws/{zone_id}")
async def websocket_zone(ws: WebSocket, zone_id: str):
    """Zone-specific listener — receives updates only for one zone."""
    zone_id = zone_id.upper()
    await manager.connect(ws, zone_id=zone_id)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws, zone_id=zone_id)
