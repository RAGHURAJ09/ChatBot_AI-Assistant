import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders.youtube import YoutubeLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

CHROMA_PATH = "./chroma_db"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
llm_endpoint = HuggingFaceEndpoint(repo_id=LLM_MODEL, max_new_tokens=1024, temperature=0.5)
llm = ChatHuggingFace(llm=llm_endpoint)
vector_store = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)

def process_pdf(file_path: str):
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    vector_store.add_documents(documents=splits)
    return len(splits)

def process_youtube(url: str):
    loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    vector_store.add_documents(documents=splits)
    return len(splits)

def get_rag_chain():
    retriever = vector_store.as_retriever()
    
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, contextualize_q_prompt
    )

    system_prompt = (
        "You are a helpful and intelligent AI assistant. Always follow these rules:\n"
        "1. LANGUAGE RULE: If the user writes in Devanagari script (Hindi) **or** explicitly asks for an answer in Hindi, respond entirely in Hindi. If the user does NOT request Hindi, answer in Hinglish – English sentences with occasional Hindi words. Do NOT switch languages mid‑answer.\n"
        "2. DO NOT ECHO THE PROMPT: Never repeat the user's question as a title or heading. Just start answering immediately.\n"
        "3. CASUAL CONVERSATIONS: For greetings, small talk, or simple questions (e.g. 'what is your name', 'tmko hindi aati h'), answer in 1‑2 sentences using the language determined by Rule 1. Do NOT use the structured format for these.\n"
        "4. FOR EXPLANATIONS OR FACTUAL QUERIES: Give a clear answer (minimum 3‑5 lines). Use simple language like teaching a beginner. If technical, include real‑world examples. Use the language from Rule 1.\n"
        "5. If the user explicitly asks for 'detail', 'in detail', or 'explain more', expand your previous answer, add examples, and add use cases. Keep it structured.\n"
        "6. ONLY FOR SUBSTANTIVE FACTUAL EXPLANATIONS or DETAILED REQUESTS, use this exact format:\n\n"
        "**SHORT ANSWER:**\n"
        "<simple explanation>\n\n"
        "**DETAILED EXPLANATION:**\n"
        "<expanded explanation with examples>\n\n"
        "Use the following pieces of retrieved context to answer the question if applicable:\n"
        "{context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
    
    return rag_chain
