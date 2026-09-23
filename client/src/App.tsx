import React, { useState, useRef, useEffect } from 'react';
import Hero from './components/ui/animated-shader-hero';
import { Bot, Send, User, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

interface AgentStep {
  agent: string;
  action: string;
  elapsed?: number;
}

interface Source {
  document: string;
  page?: number;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'loading';
  content: string;
  sources?: Source[];
  agent_trace?: AgentStep[];
  mode?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Agent visualization state
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const animateAgentPipeline = async () => {
    setCompletedAgents(new Set());
    
    setActiveAgent('Orchestrator');
    await new Promise(r => setTimeout(r, 800));
    setCompletedAgents(prev => new Set(prev).add('Orchestrator'));
    
    setActiveAgent('Retriever');
    await new Promise(r => setTimeout(r, 1200));
    setCompletedAgents(prev => new Set(prev).add('Retriever'));
    
    setActiveAgent('Advisor');
  };

  const finalizeAgentPipeline = () => {
    setActiveAgent(null);
    setCompletedAgents(new Set(['Orchestrator', 'Retriever', 'Advisor']));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: loadingId, type: 'loading', content: '' }]);

    animateAgentPipeline();

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => 
        prev.map(msg => msg.id === loadingId ? {
          id: loadingId,
          type: 'ai',
          content: data.answer,
          sources: data.sources,
          agent_trace: data.agent_trace,
          mode: data.mode
        } : msg)
      );
      
      finalizeAgentPipeline();

    } catch (error) {
      console.error(error);
      setMessages(prev => 
        prev.map(msg => msg.id === loadingId ? {
          id: loadingId,
          type: 'ai',
          content: 'Unable to connect to the AskCampus backend. Make sure the FastAPI server is running.',
        } : msg)
      );
      finalizeAgentPipeline();
    } finally {
      setIsLoading(false);
    }
  };

  const formatSource = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  const scrollToChat = () => {
    document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-zinc-50 font-sans overflow-x-hidden">
      
      <Hero
        trustBadge={{
          text: "Chitkara University AI Assistant",
          icons: ["✨"]
        }}
        headline={{
          line1: "Launch Your",
          line2: "Research Into Orbit"
        }}
        subtitle="Supercharge your workflow with AI-powered answers grounded in official Chitkara University documents — fast, seamless, and intelligent."
        buttons={{
          primary: {
            text: "Start Exploring",
            onClick: scrollToChat
          }
        }}
      />
      
      <main id="chat-section" className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-8 py-24 relative z-10">
        <div className="flex items-center gap-3 mb-8">
            <Bot className="w-8 h-8 text-blue-500" />
            <h2 className="text-3xl font-serif text-white">AskCampus Agent</h2>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-[600px]">
          
          {/* Agent Sidebar */}
          <div className="w-full md:w-64 bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-2xl h-fit">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-6">Agent Pipeline</h3>
            
            <div className="space-y-6">
              {[
                { id: 'Orchestrator', desc: 'Routes & coordinates' },
                { id: 'Retriever', desc: 'Vector Search' },
                { id: 'Advisor', desc: 'Answer generation' }
              ].map((agent, i) => {
                const isActive = activeAgent === agent.id;
                const isDone = completedAgents.has(agent.id);
                
                return (
                  <div key={agent.id} className="relative">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 transition-colors ${
                        isDone ? 'text-green-500' : 
                        isActive ? 'text-blue-500' : 'text-zinc-700'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : 
                         isActive ? <Circle className="w-5 h-5 fill-current animate-pulse" /> :
                         <Circle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium transition-colors ${
                          isDone || isActive ? 'text-zinc-200' : 'text-zinc-500'
                        }`}>{agent.id}</div>
                        <div className="text-xs text-zinc-600 mt-1">{agent.desc}</div>
                      </div>
                    </div>
                    {i < 2 && (
                      <div className={`absolute left-2.5 top-6 bottom-[-1.5rem] w-px transition-colors ${
                        isDone ? 'bg-green-500/30' : 'bg-zinc-800'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                  <Bot className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg">Ask a question about Chitkara University...</p>
                  <p className="text-sm mt-2 opacity-70">Answers are grounded in official documents.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    
                    {msg.type !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] ${
                      msg.type === 'user' 
                        ? 'bg-blue-600/80 backdrop-blur-md border border-blue-500/50 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg' 
                        : 'bg-black/40 backdrop-blur-md text-zinc-200 rounded-2xl rounded-tl-sm px-5 py-4 border border-white/10 shadow-lg'
                    }`}>
                      
                      {msg.type === 'loading' ? (
                        <div className="flex items-center gap-1.5 h-6">
                          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.4s]" />
                        </div>
                      ) : (
                        <>
                          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                            {msg.content}
                          </div>

                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-zinc-700/50">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sources</div>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((src, i) => (
                                  <div key={i} className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-zinc-300">
                                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                                    {formatSource(src.document)} {src.page ? `(p. ${src.page})` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.agent_trace && msg.agent_trace.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-zinc-700/50">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Agent Trace</div>
                              <div className="space-y-1.5">
                                {msg.agent_trace.map((trace, i) => (
                                  <div key={i} className="text-xs flex items-center gap-2 text-zinc-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                    <strong className="text-zinc-300">{trace.agent}</strong>
                                    <span>—</span>
                                    <span>{trace.action.replace('Gemini + Groq + ChromaDB', 'Azure OpenAI Foundry + Azure AI Search').replace('local ChromaDB', 'Azure AI Search')}</span>
                                    {trace.elapsed && <span className="text-zinc-600">({trace.elapsed}s)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {msg.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5 text-zinc-300" />
                      </div>
                    )}

                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/40 backdrop-blur-lg border-t border-white/10">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about Chitkara University..."
                  disabled={isLoading}
                  className="w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-full py-3.5 pl-6 pr-14 text-sm text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-zinc-600 text-sm mt-12">
        <p>Powered by AskCampus Multi-Agent Pipeline</p>
      </footer>
    </div>
  );
}

export default App;
