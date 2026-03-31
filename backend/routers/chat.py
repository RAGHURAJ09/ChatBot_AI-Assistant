from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel

import models, schemas
from database import get_db
from utils.security import get_current_user
from services.rag import get_rag_chain
from services.web_search import search_web
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    chat_id: int
    message: str
    use_web_search: bool = False

@router.post("/create", response_model=schemas.ChatResponse)
async def create_chat(title: str, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_chat = models.Chat(title=title, user_id=current_user.id)
    db.add(db_chat)
    await db.commit()
    await db.refresh(db_chat)
    return {
        "id": db_chat.id,
        "title": db_chat.title,
        "created_at": db_chat.created_at,
        "messages": []
    }

@router.get("/history", response_model=List[schemas.ChatResponse])
async def get_chats(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    stmt = select(models.Chat).where(models.Chat.user_id == current_user.id).options(selectinload(models.Chat.messages))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{chat_id}/messages", response_model=List[schemas.MessageResponse])
async def get_messages(chat_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.Chat).where(models.Chat.id == chat_id, models.Chat.user_id == current_user.id)
    result = await db.execute(stmt)
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    stmt_msg = select(models.Message).where(models.Message.chat_id == chat_id).order_by(models.Message.created_at)
    res_msg = await db.execute(stmt_msg)
    return res_msg.scalars().all()

@router.post("/message")
async def send_message(req: ChatRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Validate chat
    stmt = select(models.Chat).where(models.Chat.id == req.chat_id, models.Chat.user_id == current_user.id)
    result = await db.execute(stmt)
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # Get historical messages to construct chat history
    stmt_msg = select(models.Message).where(models.Message.chat_id == req.chat_id).order_by(models.Message.created_at)
    res_msg = await db.execute(stmt_msg)
    history_msgs = res_msg.scalars().all()
    
    chat_history = []
    for msg in history_msgs:
        if msg.role == "user":
            chat_history.append(HumanMessage(content=msg.content))
        else:
            chat_history.append(AIMessage(content=msg.content))
            
    # Add new user message to DB
    user_msg = models.Message(chat_id=req.chat_id, role="user", content=req.message)
    db.add(user_msg)
    await db.commit()
    
    # Check for trigger words for detailed explanation
    user_query = req.message
    trigger_words = ["detail", "in detail", "explain more", "explain in detail", "detail answer"]
    if any(word in user_query.lower() for word in trigger_words):
        user_query = "Explain your previous answer in detail. Expand the explanation, add real-world examples, and add use cases. Follow the strict SHORT ANSWER and DETAILED EXPLANATION format."

    # Process
    if req.use_web_search:
        search_result = search_web(user_query)
        context = f"Web Search Result: {search_result}\n\nUser Message: {user_query}"
        rag_chain = get_rag_chain()
        response = rag_chain.invoke({"input": context, "chat_history": chat_history})
        bot_response = response.get("answer", "I am unable to process that.")
    else:
        rag_chain = get_rag_chain()
        response = rag_chain.invoke({"input": user_query, "chat_history": chat_history})
        bot_response = response.get("answer", "I am unable to process that.")
        
    # Add bot message to DB
    ai_msg = models.Message(chat_id=req.chat_id, role="ai", content=bot_response)
    db.add(ai_msg)
    await db.commit()
    
    return {"message": bot_response}
