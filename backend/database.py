import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

# Force asyncpg driver if we're using postgresql and it's missing the +asyncpg suffix
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg needs careful SSL configuration depending on where it's connecting
connect_args = {}
if "asyncpg" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    # Enable SSL only if the host is NOT localhost / 127.0.0.1 (e.g. Neon, AWS)
    if parsed.hostname not in ("localhost", "127.0.0.1", None):
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx
        # Neon/Cloud cold starts can take a while
        connect_args["timeout"] = 120
        connect_args["command_timeout"] = 120
    
    # Remove query parameters from the URL that asyncpg doesn't support
    if "?" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0]

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_timeout=30,
    pool_pre_ping=True,  # Auto-reconnect stale connections
    pool_recycle=300,     # Recycle connections every 5 min
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
