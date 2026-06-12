from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, chat, upload

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"ERROR creating database tables: {e}")
        import traceback
        traceback.print_exc()
    yield
    # Shutdown: Clean up if needed
    pass

app = FastAPI(title="AI Chat App", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
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

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Chat API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
