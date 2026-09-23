import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, ChevronRight, Home, Clock, Settings, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/ui/button';
import { BoltStyleChat, RayBackground, ChatInput as BoltChatInput } from './components/ui/bolt-style-chat';

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}


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

interface Session {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Agent visualization state
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());

  const animateAgentPipeline = async () => {
    setCompletedAgents(new Set());
    
    setActiveAgent('Orchestrator');
    await new Promise(r => setTimeout(r, 800));
    setCompletedAgents(prev => new Set(prev).add('Orchestrator'));
    
    setActiveAgent('Retriever');
    await new Promise(r => setTimeout(r, 1200));
    setCompletedAgents(prev => new Set(prev).add('Retriever'));
    
    setActiveAgent('Advisor');
    await new Promise(r => setTimeout(r, 800));
  };

  const finalizeAgentPipeline = () => {
    setActiveAgent(null);
    setCompletedAgents(new Set(['Orchestrator', 'Retriever', 'Advisor']));
  };

  const { adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  


  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('askcampus_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setSessions(prev => {
        const existing = prev.find(s => s.id === currentSessionId);
        const title = messages[0]?.content.slice(0, 30) + (messages[0]?.content.length > 30 ? '...' : '') || 'New Chat';
        
        const newSession: Session = {
          id: currentSessionId,
          title,
          messages,
          timestamp: existing ? existing.timestamp : Date.now()
        };
        
        const updated = existing 
          ? prev.map(s => s.id === currentSessionId ? newSession : s)
          : [newSession, ...prev];
          
        localStorage.setItem('askcampus_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, currentSessionId]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(Date.now().toString());
  };

  const loadSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(session.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);



  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = overrideInput || input;
    if (!finalInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: finalInput.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    adjustHeight(true);
    setIsLoading(true);

    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: loadingId, type: 'loading', content: '' }]);

    try {
      const [response] = await Promise.all([
        fetch('/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMessage.content }),
        }),
        animateAgentPipeline()
      ]);

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

  return (
    <div className="flex w-full h-screen bg-[#0f0f0f] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar - Retain minimalist sidebar from previous refactor for app functionality */}
      <aside className="w-16 md:w-20 bg-[#0f0f0f] border-r border-white/5 flex flex-col items-center py-6 shadow-xl z-20 relative">
        <div className="font-bold text-xl mb-8 tracking-tighter text-white">Ask</div>
        <nav className="flex flex-col gap-4 w-full px-2">
          <Button variant="ghost" className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white hover:bg-white/20 mx-auto">
            <Home className="w-5 h-5" />
          </Button>
          <Button variant="ghost" className="w-10 h-10 md:w-12 md:h-12 rounded-full text-[#8a8a8f] hover:text-white hover:bg-white/5 mx-auto relative group">
            <Clock className="w-5 h-5" />
            <div className="absolute left-full ml-4 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-64 z-50 pointer-events-none">
              <h3 className="text-xs font-semibold text-[#5a5a5f] uppercase mb-2">History</h3>
              <div className="space-y-1">
                {sessions.map(s => (
                  <div key={s.id} className="text-sm truncate text-[#a0a0a5] pointer-events-auto cursor-pointer hover:text-white py-1" onClick={() => loadSession(s.id)}>{s.title}</div>
                ))}
                {sessions.length === 0 && <div className="text-sm text-[#5a5a5f]">No history yet</div>}
              </div>
              <Button onClick={startNewChat} className="w-full mt-3 bg-[#1488fc] hover:bg-[#1a94ff] pointer-events-auto text-xs h-8 text-white border-none rounded-full">New Chat</Button>
            </div>
          </Button>

        </nav>
        <div className="mt-auto flex flex-col gap-4 w-full px-2">
          <Button variant="ghost" className="w-10 h-10 md:w-12 md:h-12 rounded-full text-[#8a8a8f] hover:text-white hover:bg-white/5 mx-auto">
            <Settings className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 mx-auto flex items-center justify-center overflow-hidden">
            <User className="w-6 h-6 text-[#8a8a8f]" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col items-center overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
        
        {messages.length === 0 ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <BoltStyleChat 
              title="What will you" 
              subtitle="Chitkara, simplified." 
              placeholder="Ask a question about Chitkara University..."
              announcementText="AskCampus AI Agent"
              onSend={(msg) => {
                handleSubmit(undefined, msg);
              }}
            />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center relative min-h-screen">
            <RayBackground />
            
            {/* Header when chatting */}
            <div className="w-full p-4 md:p-6 flex justify-between items-center border-b border-white/5 sticky top-0 bg-[#0f0f0f]/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 p-0.5 shadow-lg shadow-blue-500/20">
                  <div className="w-full h-full bg-[#1a1a1e] rounded-full" />
                </div>
                <h2 className="font-medium text-white">AskCampus Agent</h2>
                {isLoading && <div className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
              </div>
            </div>
            
            <div className="w-full max-w-4xl flex-1 flex flex-col p-4 md:p-8 space-y-8 pb-40 relative z-10">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#1e1e22] flex items-center justify-center flex-shrink-0 mt-1 shadow-inner ring-1 ring-white/[0.08]">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] ${
                    msg.type === 'user' 
                      ? 'bg-[#1e1e22] ring-1 ring-white/[0.08] text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.4)]' 
                      : 'bg-[#1a1a1e]/80 backdrop-blur-md ring-1 ring-white/[0.08] text-[#e0e0e0] rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg'
                  }`}>
                    {msg.type === 'loading' ? (
                      <div className="flex items-center gap-1.5 h-6">
                        <div className="w-2 h-2 rounded-full bg-[#5a5a5f] animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-[#5a5a5f] animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-[#5a5a5f] animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-[10px] font-semibold text-[#5a5a5f] uppercase tracking-wider mb-2">Sources</div>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, i) => (
                                <div key={i} className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-[#a0a0a5]">
                                  <ChevronRight className="w-3 h-3 text-[#5a5a5f]" />
                                  {formatSource(src.document)} {src.page ? `(p. ${src.page})` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {msg.agent_trace && msg.agent_trace.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-[10px] font-semibold text-[#5a5a5f] uppercase tracking-wider mb-2">Agent Trace</div>
                            <div className="space-y-1.5">
                              {msg.agent_trace.map((trace, i) => (
                                <div key={i} className="text-xs flex items-center gap-2 text-[#8a8a8f]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1488fc]/50" />
                                  <strong className="text-[#a0a0a5]">{trace.agent}</strong>
                                  <span>—</span>
                                  <span>{trace.action.replace('Gemini + Groq + ChromaDB', 'Azure OpenAI Foundry + Azure AI Search').replace('local ChromaDB', 'Azure AI Search')}</span>
                                  {trace.elapsed && <span className="text-[#5a5a5f]">({trace.elapsed}s)</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1e] flex items-center justify-center flex-shrink-0 mt-1 shadow-inner ring-1 ring-white/[0.08]">
                      <User className="w-4 h-4 text-[#a0a0a5]" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-center my-6">
                  <div className="flex items-center gap-2 md:gap-4 my-6">
                    {['Orchestrator', 'Retriever', 'Advisor'].map((step, index) => {
                      const isActive = activeAgent === step;
                      const isCompleted = completedAgents.has(step);
                      return (
                        <React.Fragment key={step}>
                          <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : isCompleted ? 'opacity-70' : 'opacity-30'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg ${
                              isActive ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' :
                              isCompleted ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                              'bg-white/5 border-white/10 text-[#8a8a8f]'
                            }`}>
                              {isCompleted ? <Check className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-[#8a8a8f]'}`}>
                              {step}
                            </span>
                          </div>
                          {index < 2 && (
                            <div className="w-8 md:w-12 h-[1px] bg-white/10 relative">
                              <div className={`absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500 ${
                                isCompleted ? 'w-full' : 'w-0'
                              }`} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Fixed Chat Input when chatting */}
            <div className="w-full p-4 md:p-6 sticky bottom-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f] to-transparent pt-10 flex justify-center z-20">
              <BoltChatInput 
                value={input}
                onChange={setInput}
                onSend={(msg) => handleSubmit(undefined, msg)}
                placeholder="Ask a question about Chitkara University..."
                disabled={isLoading}
              />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
