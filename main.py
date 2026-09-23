"""
AskCampus — Multi-Agent Backend (Gemini + Groq + ChromaDB)

Three logical agents:
  • Orchestrator  — routes queries and coordinates
  • Retriever     — searches local Chroma vector store using Gemini Embeddings
  • Advisor       — generates grounded answers from context using Groq Chat
"""

import os
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()


# ─── Configuration ───────────────────────────────────────────

GROQ_API_KEY = os.environ["GROQ_API_KEY"]

CHAT_MODEL = os.environ.get("CHAT_MODEL", "qwen/qwen3.8-27b")

CHROMA_PATH = "chroma_db"

# ─── 1. Initialize Clients ──────────────────────────────────

print("🔗 Connecting to HuggingFace (Embeddings), Groq (Chat), and ChromaDB ...")

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model=CHAT_MODEL,
    temperature=0,
)

if os.path.exists(CHROMA_PATH):
    vector_store = Chroma(
        persist_directory=CHROMA_PATH, 
        embedding_function=embeddings
    )
    print("   ✅ ChromaDB loaded")
else:
    vector_store = None
    print("   ⚠️ ChromaDB not found! Please run ingest.py first.")

# ─── FastAPI App ─────────────────────────────────────────────

app = FastAPI(
    title="AskCampus — Multi-Agent University Assistant",
    description="Assistant powered by Groq, Gemini, and local ChromaDB.",
    version="2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Agent System Prompt ────────────────────────────────────

ADVISOR_SYSTEM_PROMPT = """You are the Advisor Agent for AskCampus, a Chitkara University assistant.

Answer the question using ONLY the provided context from university documents.

Rules:
- Do not use your own knowledge.
- Do not infer missing facts.
- Do not combine unrelated information to create an answer.
- If the context does not contain enough information,
  clearly say that the information was not found
  in the available Chitkara documents.
- Always cite which document and page the information came from based on the context.
- Be clear, concise, and helpful."""


# ─── Agents ──────────────────────────────────────────────────

def retriever_agent(question: str) -> dict:
    """
    Retriever Agent: searches ChromaDB for relevant document chunks.
    """
    start = time.time()
    
    if not vector_store:
        return {"chunks": [], "sources": [], "elapsed": 0}

    results = vector_store.similarity_search(question, k=5)

    chunks = []
    sources = []
    for doc in results:
        chunks.append(doc.page_content)
        sources.append({
            "document": doc.metadata.get("source", "Unknown"),
            "page": str(doc.metadata.get("page", "")),
        })

    elapsed = round(time.time() - start, 2)
    return {"chunks": chunks, "sources": sources, "elapsed": elapsed}


def advisor_agent(question: str, context: str) -> dict:
    """
    Advisor Agent: generates a grounded answer from context
    using Groq Chat.
    """
    start = time.time()

    prompt_messages = [
        SystemMessage(content=ADVISOR_SYSTEM_PROMPT),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion:\n{question}")
    ]
    
    response = llm.invoke(prompt_messages)
    answer = response.content

    elapsed = round(time.time() - start, 2)
    return {"answer": answer, "elapsed": elapsed}


def orchestrator_agent(question: str) -> dict:
    """
    Orchestrator Agent: coordinates Retriever and Advisor
    """
    start = time.time()
    agent_trace = []
    mode = "Gemini + Groq + ChromaDB"

    agent_trace.append({
        "agent": "Orchestrator",
        "action": f"Received question — {mode}",
        "elapsed": 0,
    })
    
    if not vector_store:
        return {
            "question": question,
            "answer": "Server configuration error: Local ChromaDB not found. Please run ingest.py first.",
            "sources": [],
            "agent_trace": agent_trace,
            "total_elapsed": 0,
            "mode": mode,
        }

    # Retriever Agent
    retrieval = retriever_agent(question)
    agent_trace.append({
        "agent": "Retriever",
        "action": f"Found {len(retrieval['chunks'])} chunks via local ChromaDB",
        "elapsed": retrieval["elapsed"],
    })

    if not retrieval["chunks"]:
        total_elapsed = round(time.time() - start, 2)
        agent_trace.append({
            "agent": "Advisor",
            "action": "No context available — reporting to user",
            "elapsed": 0,
        })
        return {
            "question": question,
            "answer": "I could not find relevant information in the available "
                      "Chitkara University documents to answer your question.",
            "sources": [],
            "agent_trace": agent_trace,
            "total_elapsed": total_elapsed,
            "mode": mode,
        }

    # Advisor Agent
    context = "\n\n---\n\n".join(retrieval["chunks"])
    advice = advisor_agent(question, context)
    agent_trace.append({
        "agent": "Advisor",
        "action": "Generated grounded answer from context",
        "elapsed": advice["elapsed"],
    })

    total_elapsed = round(time.time() - start, 2)
    agent_trace.append({
        "agent": "Orchestrator",
        "action": "Synthesized final response with sources",
        "elapsed": total_elapsed,
    })

    return {
        "question": question,
        "answer": advice["answer"],
        "sources": retrieval["sources"],
        "agent_trace": agent_trace,
        "total_elapsed": total_elapsed,
        "mode": mode,
    }


from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# ─── API ─────────────────────────────────────────────────────

class QuestionRequest(BaseModel):
    question: str

@app.post("/ask")
def ask_question(request: QuestionRequest):
    """
    The Orchestrator Agent receives the question, delegates to
    Retriever and Advisor agents, returns grounded answer.
    """
    return orchestrator_agent(request.question)

app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")