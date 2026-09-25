"""
AskCampus — Document Ingestion Pipeline (Google Gemini + ChromaDB)
Loads PDFs, chunks them, generates embeddings via Google Gemini,
and stores them in a local Chroma vector database.
"""

import os
import shutil

from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

load_dotenv()

# ─── Configuration ───────────────────────────────────────────

DATA_DIR = "data"
CHROMA_PATH = "chroma_db"

# ─── 1. Load PDFs ───────────────────────────────────────────

print("\n📄 Loading PDFs from data/ ...")
loader = PyPDFDirectoryLoader(DATA_DIR)
documents = loader.load()

if not documents:
    print("❌ No PDF pages found in data/. Add PDF files and try again.")
    exit(1)

print(f"   Loaded {len(documents)} pages from PDFs.")


# ─── 2. Chunk Documents ─────────────────────────────────────

print("✂️  Splitting into chunks ...")
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=400,
)
chunks = splitter.split_documents(documents)
print(f"   Created {len(chunks)} chunks.")


# ─── 3. Generate Embeddings & Store in Chroma ───────────────

print("🧠 Generating embeddings and storing in local ChromaDB ...")

# Clear out the existing database
if os.path.exists(CHROMA_PATH):
    print("   Clearing existing database...")
    shutil.rmtree(CHROMA_PATH)

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

# Create the vector store
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory=CHROMA_PATH
)

print(f"\n✅ Done! {len(chunks)} chunks indexed in local ChromaDB.")
print(f"   Database path: {CHROMA_PATH}")