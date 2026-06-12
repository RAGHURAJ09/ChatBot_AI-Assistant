import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders.youtube import YoutubeLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import os

CHROMA_PATH = "./chroma_db"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

# Initialize components lazily or globally
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
llm_endpoint = HuggingFaceEndpoint(repo_id=LLM_MODEL, max_new_tokens=1024, temperature=0.5)
llm = ChatHuggingFace(llm=llm_endpoint)

# Ensure vector store is initialized
if not os.path.exists(CHROMA_PATH):
    os.makedirs(CHROMA_PATH)
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
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
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
        "You are a helpful, intelligent, and highly capable AI assistant.\n"
        "### Conversational Guidelines:\n"
        "1. **Tone & Style:** Be natural, conversational, and direct. Avoid rigid, awkward, or robotic phrasing. Provide helpful, clear, and easy-to-understand explanations.\n"
        "2. **Language Matching (Crucial):** \n"
        "   - If the user writes in English, reply in English.\n"
        "   - If the user writes in Hinglish (Hindi written using the English alphabet, e.g., 'me smjh nii pa rha'), you MUST reply in natural Hinglish. Do NOT use proper Devanagari Hindi script and do NOT reply in pure English. Reply exactly the way an Indian would chat in Hinglish (e.g., 'Haan, main samajh sakta hu, chaliye dobara try karte hain...').\n"
        "   - If the user writes in proper Hindi (Devanagari script), reply in proper Hindi.\n"
        "3. **Formatting:** Use formatting like bullet points or bold text where it helps readability, but avoid unnecessary or dramatic headers.\n"
        "4. **No Awkward Headers:** NEVER use headers like 'SAMAJHDAAR JAWAB', 'JAWAB:', or unnatural tags. Just start your answer naturally.\n\n"
        "Use the following context if relevant:\n"
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
