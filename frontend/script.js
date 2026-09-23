/**
 * AskCampus — Multi-Agent Frontend Logic
 * Handles chat interaction and agent pipeline visualization.
 */

const API_URL = "http://127.0.0.1:8000";

const questionInput = document.getElementById("question");
const chat = document.getElementById("chat");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");

// Agent status elements
const agentOrchestrator = document.getElementById("agent-orchestrator");
const agentRetriever = document.getElementById("agent-retriever");
const agentAdvisor = document.getElementById("agent-advisor");
const connectors = document.querySelectorAll(".agent-connector");


// ─── Suggestion Buttons ─────────────────────────────────────

function useSuggestion(text) {
    questionInput.value = text;
    questionInput.focus();
}


// ─── Keyboard Handling ──────────────────────────────────────

function handleKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        askQuestion();
    }
}


// ─── Agent Pipeline Visualization ───────────────────────────

function resetAgents() {
    [agentOrchestrator, agentRetriever, agentAdvisor].forEach(el => {
        el.classList.remove("active", "done");
    });
    connectors.forEach(c => c.classList.remove("active", "done"));
}

function activateAgent(name) {
    const map = {
        "Orchestrator": { el: agentOrchestrator, connector: null },
        "Retriever": { el: agentRetriever, connector: connectors[0] },
        "Advisor": { el: agentAdvisor, connector: connectors[1] },
    };

    const entry = map[name];
    if (!entry) return;

    entry.el.classList.add("active");
    if (entry.connector) entry.connector.classList.add("active");
}

function completeAgent(name) {
    const map = {
        "Orchestrator": { el: agentOrchestrator, connector: null },
        "Retriever": { el: agentRetriever, connector: connectors[0] },
        "Advisor": { el: agentAdvisor, connector: connectors[1] },
    };

    const entry = map[name];
    if (!entry) return;

    entry.el.classList.remove("active");
    entry.el.classList.add("done");
    if (entry.connector) {
        entry.connector.classList.remove("active");
        entry.connector.classList.add("done");
    }
}

async function animateAgentPipeline() {
    resetAgents();

    // Orchestrator starts
    activateAgent("Orchestrator");
    await sleep(400);
    completeAgent("Orchestrator");

    // Retriever starts
    activateAgent("Retriever");
    await sleep(300);

    // Advisor starts (overlapping)
    activateAgent("Advisor");
}

function finalizeAgentPipeline() {
    completeAgent("Retriever");
    completeAgent("Advisor");
    completeAgent("Orchestrator");

    // Reset after a delay
    setTimeout(resetAgents, 3000);
}


// ─── Message Rendering ─────────────────────────────────────

function addUserMessage(question) {
    // Hide welcome on first message
    if (welcome) {
        welcome.style.display = "none";
    }

    const message = document.createElement("div");
    message.className = "message user-message";
    message.innerHTML = `
        <div class="user-bubble">
            ${escapeHtml(question)}
        </div>
    `;
    chat.appendChild(message);
    scrollToBottom();
}


function addLoadingMessage() {
    const message = document.createElement("div");
    message.className = "message ai-message";
    message.id = "loading-message";
    message.innerHTML = `
        <div class="ai-icon">✦</div>
        <div class="ai-content">
            <div class="loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chat.appendChild(message);
    scrollToBottom();
}


function removeLoadingMessage() {
    const loading = document.getElementById("loading-message");
    if (loading) loading.remove();
}


function addAIMessage(data) {
    const message = document.createElement("div");
    message.className = "message ai-message";

    // Build sources HTML
    let sourcesHTML = "";
    if (data.sources && data.sources.length > 0) {
        const uniqueSources = deduplicateSources(data.sources);
        sourcesHTML = `
            <div class="sources">
                <div class="sources-title">Sources</div>
                ${uniqueSources.map(source => `
                    <div class="source">
                        <span class="source-icon">📄</span>
                        <span>
                            ${escapeHtml(formatSourceName(source.document || "Document"))}
                            ${source.page ? ` — Page ${escapeHtml(source.page)}` : ""}
                        </span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // Build agent trace HTML
    let traceHTML = "";
    if (data.agent_trace && data.agent_trace.length > 0) {
        const modeLabel = data.mode || "Multi-Agent";
        traceHTML = `
            <div class="agent-trace">
                <div class="agent-trace-title">Agent Pipeline <span class="trace-mode">${escapeHtml(modeLabel)}</span></div>
                ${data.agent_trace.map(step => `
                    <div class="agent-trace-step">
                        <span class="agent-trace-dot ${step.agent.toLowerCase()}"></span>
                        <span><strong>${escapeHtml(step.agent)}</strong> — ${escapeHtml(step.action)}</span>
                        ${step.elapsed ? `<span class="trace-time">${step.elapsed}s</span>` : ""}
                    </div>
                `).join("")}
            </div>
        `;
    }

    message.innerHTML = `
        <div class="ai-icon">✦</div>
        <div class="ai-content">
            <div>${formatAnswer(data.answer)}</div>
            ${sourcesHTML}
            ${traceHTML}
        </div>
    `;

    chat.appendChild(message);
    scrollToBottom();
}


// ─── Main Ask Function ──────────────────────────────────────

async function askQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;

    addUserMessage(question);
    questionInput.value = "";
    sendButton.disabled = true;
    addLoadingMessage();

    // Animate the agent pipeline in the sidebar
    animateAgentPipeline();

    try {
        const response = await fetch(`${API_URL}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        removeLoadingMessage();
        addAIMessage(data);
        finalizeAgentPipeline();

    } catch (error) {
        removeLoadingMessage();
        finalizeAgentPipeline();

        addAIMessage({
            answer: "Unable to connect to the AskCampus backend. Make sure the FastAPI server is running.",
            sources: [],
            agent_trace: [],
        });

        console.error(error);

    } finally {
        sendButton.disabled = false;
        questionInput.focus();
    }
}


// ─── Utilities ──────────────────────────────────────────────

function scrollToBottom() {
    chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth",
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSourceName(path) {
    // Extract just the filename from the full path
    const parts = path.split("/");
    return parts[parts.length - 1];
}

function deduplicateSources(sources) {
    const seen = new Set();
    return sources.filter(source => {
        const key = `${source.document}_${source.page}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function formatAnswer(text) {
    // Basic markdown-like formatting
    let formatted = escapeHtml(text);

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}