
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Message, ReadingLevel } from '../types';
import { READING_LEVEL_PROMPTS } from '../constants';
// Note: we intentionally do not call the Gemini API for default responses.
// The chat will reply with a deterministic message explaining quantum
// computing for a 7-year-old regardless of user input.

interface ChatViewProps {
  session: ChatSession;
  // include sessionId to ensure parent updates the correct session (avoids race when creating new sessions)
  onUpdateMessages: (sessionId: string, messages: Message[]) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ session, onUpdateMessages }) => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState<ReadingLevel>(ReadingLevel.CHILD);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isGenerating]);

  // Handle example starters
  useEffect(() => {
    const handleExampleStart = (e: any) => {
      handleSendMessage(e.detail);
    };
    window.addEventListener('start-example-chat', handleExampleStart);
    return () => window.removeEventListener('start-example-chat', handleExampleStart);
  }, [session, level]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      level: level
    };

  const updatedMessages = [...session.messages, userMessage];
  onUpdateMessages(session.id, updatedMessages);
    setInput('');
    setIsGenerating(true);

    try {
      const history = session.messages.map(m => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      // Force the assistant to always explain quantum computing like the user is 7 years old.
      // This overrides the reading level/topic choices and makes the assistant respond
      // about quantum computing in simple terms regardless of the user's raw input.
      const prompt = `You are a friendly teacher. Always explain QUANTUM COMPUTING as if the person asking is a 7-year-old child. Use short sentences, simple words, playful analogies, and concrete examples. If the user asks something else, tie it back to quantum computing with a simple comparison.\n\nUser input:\n${text}`;
      
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: '',
        timestamp: Date.now()
      };

  const messagesWithPlaceholder = [...updatedMessages, modelMessage];
  onUpdateMessages(session.id, messagesWithPlaceholder);

      // Instead of calling the external Gemini API, respond with a fixed
      // child-friendly explanation about quantum computing. This ensures
      // deterministic replies and avoids leaking API keys.
      const defaultReply = `Quantum computing is like a magical playground where tiny things called quantum bits, or qubits, can be both 0 and 1 at the same time — like a spinning coin that is both heads and tails until you look. Because qubits can do many things at once, quantum computers can try lots of answers quickly for certain puzzles. They use special rules from quantum physics, like being extra tiny and sharing secrets (we call it entanglement), to help solve tricky problems. It's a bit like asking many friends to try puzzle pieces at the same time and seeing which fits first.\n\n(That's quantum computing: tiny, magical bits doing many things together to solve hard puzzles!)`;

      onUpdateMessages(session.id, [
        ...updatedMessages,
        { ...modelMessage, content: defaultReply }
      ]);
    } catch (error: any) {
      console.error("Failed to generate response", error);
      
      let errorText = "Oops! I hit a snag. Could you try sending that again?";
      
      // Convert error to string to check for API key patterns
      const errorStr = error.toString() + (error.message || "");

      if (errorStr.includes('API_KEY_INVALID') || errorStr.includes('API key not valid') || errorStr.includes('INVALID_ARGUMENT')) {
        errorText = "Configuration Error: The Gemini API key is invalid.\n\n" +
                    "FIX: Rename your Gemini key to exactly 'API_KEY' (remove the VITE_ prefix) in your .env file and RESTART your terminal/dev server.";
      } else if (errorStr.includes('403') || errorStr.includes('permission denied')) {
        errorText = "Permission Error: Access to Gemini API was denied. Check your key permissions in Google AI Studio.";
      } else if (errorStr.includes('quota') || errorStr.includes('429')) {
        errorText = "Quota Error: You've reached the Gemini API limit. Please try again in a minute.";
      }

      onUpdateMessages([
        ...updatedMessages,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: errorText,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsGenerating(false);
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4 sm:px-6">
      <div className="flex-1 overflow-y-auto space-y-10 py-8 no-scrollbar">
        {session.messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <i className="fas fa-comments text-4xl mb-4"></i>
            <p className="text-sm">Start the conversation by pasting some text below.</p>
          </div>
        )}

        {session.messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex gap-5 animate-in slide-in-from-bottom-2 duration-300 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${
              message.role === 'model' ? (message.content.includes('Error') ? 'bg-red-600' : 'bg-blue-600') : 'bg-[#2f2f2f]'
            }`}>
              <i className={`fas ${message.role === 'model' ? (message.content.includes('Error') ? 'fa-exclamation-triangle' : 'fa-robot') : 'fa-user'} text-xs text-white`}></i>
            </div>
            
            <div className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-2xl px-5 py-4 ${
                message.role === 'user' 
                  ? 'bg-[#2f2f2f] text-gray-100 rounded-tr-none' 
                  : message.content.includes('Error') 
                    ? 'bg-red-500/10 border border-red-500/50 text-red-200' 
                    : 'bg-transparent text-gray-200 border border-gray-800/50 bg-gray-800/10'
              }`}>
                {message.level && message.role === 'user' && (
                  <div className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-bold mb-3 flex items-center gap-1.5 opacity-80">
                    <i className="fas fa-layer-group text-[8px]"></i>
                    Level: {message.level}
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                  {message.content}
                </div>
              </div>
              <span className="text-[10px] text-gray-600 mt-2 font-medium">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isGenerating && !session.messages.some(m => m.role === 'model' && m.content === '') && (
          <div className="flex gap-5 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <i className="fas fa-robot text-xs text-white"></i>
            </div>
            <div className="bg-gray-800/10 border border-gray-800/50 rounded-2xl px-5 py-6 flex space-x-2 items-center">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="pb-8 pt-4">
        <div className="max-w-3xl mx-auto relative bg-[#1e1f20] border border-gray-700 rounded-[32px] p-2 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
          <div className="flex flex-col">
            <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Mode</span>
              <div className="flex gap-2">
                {Object.values(ReadingLevel).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border ${
                      level === lvl 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-[#2b2c2e] border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#333537]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-end gap-2 px-3 pb-3 pt-1">
              <textarea
                ref={textAreaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to explain something complex..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 text-[15px] py-3 px-1 resize-none max-h-[200px] overflow-y-auto leading-relaxed"
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                disabled={!input.trim() || isGenerating}
                onClick={() => handleSendMessage()}
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all ${
                  input.trim() && !isGenerating
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-90'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                ) : (
                  <i className="fas fa-arrow-up text-sm"></i>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4 text-[10px] text-gray-500 tracking-widest uppercase font-bold opacity-30">
          <i className="fas fa-shield-alt"></i>
          <span>Context-Aware Explanations</span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
