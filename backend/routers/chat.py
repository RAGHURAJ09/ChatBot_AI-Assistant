from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
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
    # Explicitly load the newly created chat with its (empty) messages
    stmt = select(models.Chat).where(models.Chat.id == db_chat.id).options(selectinload(models.Chat.messages))
    result = await db.execute(stmt)
    chat = result.scalars().first()
    return chat

@router.get("/history", response_model=List[schemas.ChatResponse])
async def get_chats(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
        
    stmt_msg = select(models.Message).where(models.Message.chat_id == req.chat_id).order_by(models.Message.created_at)
    res_msg = await db.execute(stmt_msg)
    history_msgs = res_msg.scalars().all()
    
    # Keep only the last 10 messages to avoid HuggingFace token limit errors (422)
    history_msgs = history_msgs[-10:]
    
    chat_history = []
    for msg in history_msgs:
        if msg.role == "user":
            chat_history.append(HumanMessage(content=msg.content))
        else:
            chat_history.append(AIMessage(content=msg.content))
            
    user_msg = models.Message(chat_id=req.chat_id, role="user", content=req.message)
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)
    
    # Check for trigger words to expand the response
    user_query = req.message
    trigger_words = ["detail", "in detail", "explain more", "explain in detail", "detail answer"]
    if any(word in user_query.lower() for word in trigger_words):
        user_query = f"{user_query}\n(Please provide a detailed explanation, expand on the topic, add real-world examples, and provide use cases.)"

    # Process
    try:
        rag_chain = get_rag_chain()
        if req.use_web_search:
            search_result = search_web(user_query)
            # Truncate search result to avoid token limit errors
            if len(search_result) > 2000:
                search_result = search_result[:2000] + "...(truncated)"
            context = f"Web Search Result: {search_result}\n\nUser Message: {user_query}"
            response = rag_chain.invoke({"input": context, "chat_history": chat_history})
        else:
            response = rag_chain.invoke({"input": user_query, "chat_history": chat_history})
            
        assistant_response = response.get("answer", "I didn't catch that.")
    except Exception as e:
        print(f"RAG pipeline error: {e}")
        assistant_response = "Oops, something went wrong on my end while trying to answer that."
        
    ai_msg = models.Message(chat_id=req.chat_id, role="assistant", content=assistant_response)
    db.add(ai_msg)
    await db.commit()
    await db.refresh(ai_msg)
    
    return {
        "user_message_id": user_msg.id,
        "ai_message_id": ai_msg.id,
        "message": assistant_response
    }

@router.put("/message/{message_id}", response_model=schemas.MessageResponse)
async def update_message(message_id: int, req: schemas.MessageUpdate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.Message).join(models.Chat).where(
        models.Message.id == message_id, 
        models.Chat.user_id == current_user.id
    )
    result = await db.execute(stmt)
    msg = result.scalars().first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.content = req.content
    await db.commit()
    await db.refresh(msg)
    
    # If the user edits their own prompt, we need to generate a fresh AI response 
    # to match the new context (similar to how ChatGPT handles edits).
    if msg.role == "user":
        # Clear out all the old messages that came after this point
        from sqlalchemy import delete
        del_stmt = delete(models.Message).where(
            models.Message.chat_id == msg.chat_id,
            models.Message.id > msg.id
        )
        await db.execute(del_stmt)
        await db.commit()
        
        # Grab the updated chat history to feed into the model
        stmt_msg = select(models.Message).where(models.Message.chat_id == msg.chat_id).order_by(models.Message.created_at)
        res_msg = await db.execute(stmt_msg)
        history_msgs = res_msg.scalars().all()
        history_msgs = history_msgs[-6:] # Keep context safe
        
        chat_history = []
        for h_msg in history_msgs[:-1]: # everything before the edited message
            if h_msg.role == "user":
                chat_history.append(HumanMessage(content=h_msg.content))
            else:
                chat_history.append(AIMessage(content=h_msg.content))
                
        # Generate new response
        from services.rag import get_rag_chain
        try:
            rag_chain = get_rag_chain()
            response = rag_chain.invoke({"input": msg.content, "chat_history": chat_history})
            assistant_response = response["answer"]
        except Exception as e:
            print(f"Generation error on edit: {e}")
            assistant_response = "Oops, I had trouble generating a new response for that edit."
            
        ai_msg = models.Message(chat_id=msg.chat_id, role="assistant", content=assistant_response)
        db.add(ai_msg)
        await db.commit()
        
    return msg

@router.delete("/message/{message_id}")
async def delete_message(message_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.Message).join(models.Chat).where(
        models.Message.id == message_id, 
        models.Chat.user_id == current_user.id
    )
    result = await db.execute(stmt)
    msg = result.scalars().first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    await db.delete(msg)
    await db.commit()
    return {"status": "deleted"}

@router.delete("/{chat_id}")
async def delete_chat(chat_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.Chat).where(models.Chat.id == chat_id, models.Chat.user_id == current_user.id)
    result = await db.execute(stmt)
    chat = result.scalars().first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    await db.delete(chat)
    await db.commit()
    return {"status": "deleted"}
