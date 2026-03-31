# AI Assistant (ChatGPT Clone)

A full-stack AI-powered web application using ONLY free-tier services. 

## Features
- ChatGPT-like UI with chat history
- Chat persistence (PostgreSQL)
- Retrieval-Augmented Generation (RAG) using HuggingFace models
- Process PDF and YouTube videos for custom context
- Web Search capability (DuckDuckGo)
- User Authentication (JWT)

## Tech Stack
### Backend
- **FastAPI**: Backend web framework
- **Neon PostgreSQL**: Free cloud relational database
- **ChromaDB**: Local vector store for RAG
- **HuggingFace**: Free open-source LLMs and Embeddings
- **LangChain**: AI application framework

### Frontend
- **Next.js (App Router)**: React framework
- **Tailwind CSS**: Styling

## Setup Instructions

### 1. Database (Neon PostgreSQL)
1. Go to [Neon.tech](https://neon.tech/) and create a free tier database.
2. Get the connection string (with `asyncpg` for async usage, e.g. `postgresql+asyncpg://...`)

### 2. HuggingFace & Models
1. Create a free HuggingFace account and get an API token.
2. Create `backend/.env` based on `backend/.env.example` and set your HF token and API keys.

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Deployment (Free Tier)

### Backend Deployment (Render or Railway)
1. Push this code to GitHub.
2. Go to [Render](https://render.com) (or Railway) and create a new Web Service.
3. Connect your repository.
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Add all Environment Variables from `.env` securely.

### Frontend Deployment (Vercel)
1. Go to [Vercel](https://vercel.com) and import the repository.
2. Set the Root Directory to `frontend/`.
3. Add Environment Variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.
4. Deploy!

## Optimization Suggestions
- **Vector DB Pagination:** Move ChromaDB to a managed cloud database (like Pinecone free tier) if scaling across multiple containers, as local SQLite lock limits scale.
- **Background Tasks:** Use Celery or FastAPI BackgroundTasks for heavy PDF/YouTube processing, preventing timeout on user requests.
- **Model Size:** Inference performance depends on HuggingFace Inference API rate limits; upgrade to hosted endpoint if needed.
