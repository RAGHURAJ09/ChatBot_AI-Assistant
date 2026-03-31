from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, chat, upload

app = FastAPI(title="AI Chat App", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("FATAL ERROR: ", repr(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "ServerError: " + "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))}
    )
async def startup():
    async with engine.begin() as conn:
        # Create all tables (in production use alembic!)
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Chat API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
