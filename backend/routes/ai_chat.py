from fastapi import APIRouter
from pydantic import BaseModel

from services.chat_service import generate_ai_response

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/api/ai/chat")
async def ai_chat(data: ChatRequest):
    reply = await generate_ai_response(data.message)

    return {
        "reply": reply
    }