from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import os
import tempfile
from pydantic import BaseModel
from services.rag import process_pdf, process_youtube
from utils.security import get_current_user
from models import User

router = APIRouter(prefix="/process", tags=["Processing"])

class YoutubeUrl(BaseModel):
    url: str

@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Ensure the file is a PDF.")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name
        
    try:
        chunks = process_pdf(tmp_path)
    except Exception as e:
        os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))
        
    os.remove(tmp_path)
    return {"message": "PDF processed successfully", "chunks_added": chunks}

@router.post("/youtube")
async def upload_youtube(body: YoutubeUrl, current_user: User = Depends(get_current_user)):
    try:
        chunks = process_youtube(body.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Youtube transcript processed successfully", "chunks_added": chunks}
