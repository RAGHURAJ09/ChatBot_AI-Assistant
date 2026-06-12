# 🤖 AI Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![Backend CI](https://github.com/RAGHURAJ09/ChatBot_AI-Assistant/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/RAGHURAJ09/ChatBot_AI-Assistant/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/RAGHURAJ09/ChatBot_AI-Assistant/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/RAGHURAJ09/ChatBot_AI-Assistant/actions/workflows/frontend-ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js)](https://nextjs.org/)

> A full-stack AI-powered web application using ONLY free-tier services. Experience context-aware AI conversations with custom PDF and YouTube processing capabilities.

---

## 🌟 Features
- **🧠 Intelligent Chat:** Retrieval-Augmented Generation (RAG) using HuggingFace models.
- **💬 Full Message Controls:** Seamlessly edit past prompts to dynamically regenerate context-aware AI responses and branch conversations. Includes inline message deletion, and 1-click clipboard copying.
Token limits (HuggingFace 422 errors) are handled gracefully via dynamic context sliding.
- **📌 Sidebar Management:** Pin up to 3 favorite chats to the top of your list, share chat links, and seamlessly delete chat threads.
- **📄 Document Processing:** Process PDF and YouTube videos for custom context.
- **🔍 Web Search:** Real-time web search capability (DuckDuckGo).
- **💾 Persistence:** Chat persistence natively handled with PostgreSQL.
- **⚙️ CI/CD Pipelines:** Automated GitHub Actions workflows for continuous frontend and backend validation.
- **🔐 Secure:** Full user authentication powered by JWT.

---

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Backend web framework
- **Neon PostgreSQL**: Free cloud relational database
- **ChromaDB**: Local vector store for RAG
- **HuggingFace & LangChain**: Free open-source LLMs, Embeddings, and AI application framework

### Frontend
- **Next.js (App Router)**: React framework
- **Tailwind CSS**: Modern utility-first styling

---

## 💻 Setup Instructions

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

---

## 🚀 Deployment & Local Setup

Live deployment is currently **pending**. In the meantime, you can run the project locally:

1. Clone the repository: `git clone <repo-url>`
2. Install dependencies: `npm install` (or your language's command)
3. Run the project: `npm start`

---

## ☁️ Deployment (Free Tier)

### Backend Deployment (Render or Railway)
1. Push this code to GitHub.
2. Go to [Render](https://render.com) (or Railway) and create a new Web Service.
3. Connect your repository.
4. **Build Command**: `pip install -r backend/requirements.txt`
5. **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Add all Environment Variables from `.env` securely.

### Frontend Deployment (Vercel)
1. Go to [Vercel](https://vercel.com) and import the repository.
2. Set the Root Directory to `frontend/`.
3. Add Environment Variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.
4. Deploy!

---

## 📈 Optimization Suggestions
- **Vector DB Pagination:** Move ChromaDB to a managed cloud database (like Pinecone free tier) if scaling across multiple containers, as local SQLite lock limits scale.
- **Background Tasks:** Use Celery or FastAPI BackgroundTasks for heavy PDF/YouTube processing, preventing timeout on user requests.
- **Model Size:** Inference performance depends on HuggingFace Inference API rate limits; upgrade to hosted endpoint if needed.

---

## 📜 License and Copyright
This project is licensed under the MIT License. Copyright 2026 RAGHURAJ09.

See the [LICENSE.md](LICENSE.md) file for details.
