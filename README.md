# AskCampus 🎓

A **multi-agent AI assistant** for Chitkara University, powered by Microsoft Azure.

AskCampus uses a three-agent pipeline — **Orchestrator**, **Retriever**, and **Advisor** — to answer student questions from official university PDF documents. The system retrieves relevant information using **Azure AI Search** semantic vector search, and generates grounded answers using **Azure OpenAI**, all orchestrated through **Azure AI Foundry**.

---

## 🚀 Features

* 🤖 **Multi-Agent Architecture** — Orchestrator, Retriever, and Advisor agents
* 🔎 **Azure AI Search** — Hybrid semantic + keyword vector search
* 🧠 **Azure OpenAI** — GPT-4o-mini for answer generation, text-embedding-3-small for embeddings
* 🏗️ **Azure AI Foundry** — Agent orchestration and management platform
* 📄 **PDF Ingestion** — Automated document loading and chunking
* 📚 **Source Attribution** — Every answer cites its source document and page
* 🛡️ **Grounded Responses** — Answers come only from university documents, not model knowledge
* ⚡ **FastAPI Backend** — High-performance REST API
* 💬 **Premium Web Interface** — Dark-themed UI with live agent pipeline visualization
* 📱 **Responsive Design** — Works on desktop and mobile

---

## 🏗️ Architecture

```text
                     USER
                      │
                      ▼
               Web Chat Interface
                      │
                      │ POST /ask
                      ▼
                  FastAPI Backend
                      │
                      ▼
            ┌─────────────────────┐
            │   ORCHESTRATOR      │
            │   AGENT             │
            │  (Azure AI Foundry) │
            └────────┬────────────┘
                     │
          ┌──────────┼──────────┐
          ▼                     ▼
  ┌───────────────┐   ┌────────────────┐
  │  RETRIEVER    │   │   ADVISOR      │
  │  AGENT        │   │   AGENT        │
  │               │   │                │
  │ Azure AI      │   │ Generates      │
  │ Search tool   │   │ grounded       │
  │               │   │ answers        │
  └───────────────┘   └────────────────┘
          │
          ▼
  Azure AI Search
  (Vector Index)
```

### Agent Roles

| Agent | Role | Tools |
|-------|------|-------|
| **Orchestrator** | Routes queries, delegates to sub-agents, synthesizes final response | Connected Agents |
| **Retriever** | Searches the knowledge base using hybrid semantic + keyword search | Azure AI Search |
| **Advisor** | Generates grounded answers from retrieved context, enforces policies | Azure OpenAI GPT-4o-mini |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend and RAG pipeline |
| FastAPI | REST API framework |
| Azure AI Foundry | Agent orchestration platform |
| Azure AI Search | Vector storage and hybrid retrieval |
| Azure OpenAI | Embeddings (text-embedding-3-small) and LLM (GPT-4o-mini) |
| LangChain | PDF loading and text splitting |
| HTML / CSS / JS | Frontend interface |
| Pydantic | Request validation |

---

## 📁 Project Structure

```text
AskCampus/
│
├── frontend/
│   ├── index.html          # Chat interface with agent visualization
│   ├── style.css           # Premium dark theme with Azure design
│   └── script.js           # Chat logic and agent pipeline animation
│
├── ingest.py               # PDF → Azure AI Search ingestion pipeline
├── main.py                 # Multi-agent FastAPI backend
├── requirements.txt        # Python dependencies
├── .env                    # Azure credentials (never committed)
├── .env.example            # Template for required credentials
├── README.md               # This file
└── .gitignore              # Excludes sensitive files
```

### Local directories (excluded from Git)

| Directory | Purpose |
|---|---|
| `data/` | University PDF documents for ingestion |
| `.venv/` | Python virtual environment |

---

## ⚙️ Setup

### Prerequisites

* Python 3.9+
* Microsoft Azure for Students ($100 credit)
* Azure OpenAI deployment (GPT-4o-mini + text-embedding-3-small)
* Azure AI Search service
* Azure AI Foundry project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/AskCampus.git
cd AskCampus
```

### 2. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Copy the example and fill in your Azure credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
AZURE_AI_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_EMBEDDING_DIMENSIONS=1536
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-admin-key
AZURE_SEARCH_INDEX=chitkara-docs
```

> ⚠️ **Security**: The `.env` file must **never** be committed to GitHub.

---

## 📚 Document Ingestion

Place university PDF documents inside:

```text
data/
```

Then run:

```bash
python ingest.py
```

The ingestion pipeline performs:

```text
PDFs in data/
     ↓
PDF Loading (PyPDFDirectoryLoader)
     ↓
Text Splitting (1000 chars, 200 overlap)
     ↓
Embedding Generation (Azure OpenAI text-embedding-3-small)
     ↓
Azure AI Search Index (hybrid vector + keyword)
```

---

## 🔌 Running the Application

### Start the backend

```bash
uvicorn main:app --reload
```

API runs at: `http://127.0.0.1:8000`

API docs at: `http://127.0.0.1:8000/docs`

### Start the frontend

```bash
cd frontend
python -m http.server 5501
```

Open: `http://127.0.0.1:5501`

---

## 🔌 API Endpoint

### `POST /ask`

Request:

```json
{
    "question": "What is the course code of Object Oriented Programming?"
}
```

Response:

```json
{
    "question": "What is the course code of Object Oriented Programming?",
    "answer": "The course code for Object Oriented Programming is 25CSE0204.",
    "sources": [
        {
            "document": "data/CHO_OOP_25CSE0204_B2025_3Sem_AIML.pdf",
            "page": "1"
        }
    ],
    "agent_trace": [
        {
            "agent": "Orchestrator",
            "action": "Received question, delegating to Retriever Agent",
            "elapsed": 0
        },
        {
            "agent": "Retriever",
            "action": "Found 5 relevant document chunks",
            "elapsed": 1.23
        },
        {
            "agent": "Advisor",
            "action": "Generated grounded answer from context",
            "elapsed": 2.15
        },
        {
            "agent": "Orchestrator",
            "action": "Synthesized final response with sources",
            "elapsed": 3.41
        }
    ],
    "total_elapsed": 3.41
}
```

---

## 🔄 Multi-Agent Flow

```text
User Question
      ↓
Orchestrator Agent
  "Routes the query"
      ↓
Retriever Agent
  "Searches Azure AI Search"
  "Returns top 5 relevant chunks"
      ↓
Advisor Agent
  "Generates grounded answer"
  "Cites sources"
      ↓
Orchestrator Agent
  "Synthesizes final response"
      ↓
Answer + Sources + Agent Trace
```

---

## 🛡️ Responsible AI

* **Privacy**: No user data is stored. Queries are processed in real-time and discarded.
* **Security**: API keys stored in `.env`, never committed. Azure RBAC for access control.
* **Grounded responses**: The Advisor Agent only answers from retrieved document context, preventing hallucination.
* **Transparency**: Every response includes an agent trace showing which agents contributed and how long each took.
* **Fairness**: The system provides equal access to university information for all students.
* **Human oversight**: Source citations allow users to verify answers against original documents.

---

## 🔐 Security

The following are excluded from version control via `.gitignore`:

```text
.env
.venv/
data/
chroma_db/
__pycache__/
```

---

## 🎯 Example Questions

```text
What is the course code of Database Management System?
What is the course code of Object Oriented Programming?
What is the attendance requirement?
What are the objectives of the DBMS course?
What are the course learning outcomes?
```

---

## 👨‍💻 Team

**Mukund Bansal**

Computer Science & Engineering — AI/ML, Chitkara University

---

## 📌 Project Status

**Current Status: Working Prototype / PoC**

### Implemented

* ✅ Multi-agent pipeline (Orchestrator → Retriever → Advisor)
* ✅ Azure AI Search vector index with hybrid search
* ✅ Azure OpenAI embeddings and LLM
* ✅ PDF document ingestion
* ✅ FastAPI REST API
* ✅ Premium web interface with agent visualization
* ✅ Source attribution and agent trace
* ✅ Responsible AI practices

### Future Improvements

* Chat history and conversation memory
* Streaming responses
* Azure AI Foundry Agent Service managed hosting
* Course-wise and department-wise filtering
* Authentication and user management
* Production cloud deployment
