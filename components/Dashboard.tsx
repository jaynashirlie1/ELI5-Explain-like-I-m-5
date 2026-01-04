
import React, { useState, useEffect } from 'react';
import { User, ChatSession, Message } from '../types';
import { supabase } from '../services/supabase';
import ChatView from './ChatView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initial Load from Supabase
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('eli5_chats')
          .select('*')
          .eq('user_id', user.id)
          .order('last_updated', { ascending: false });

        if (error) throw error;
        
        if (data) {
          const formatted: ChatSession[] = data.map(item => ({
            id: item.id,
            title: item.title,
            messages: item.messages || [],
            lastUpdated: item.last_updated
          }));
          setSessions(formatted);
          if (formatted.length > 0) {
            setActiveSessionId(formatted[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSessions();
  }, [user.id]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const handleNewChat = async () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Explanation',
      messages: [],
      lastUpdated: Date.now(),
    };

    try {
      // Sync to Supabase
      const { error } = await supabase.from('eli5_chats').insert([{
        id: newSession.id,
        user_id: user.id,
        title: newSession.title,
        messages: newSession.messages,
        last_updated: newSession.lastUpdated
      }]);

      if (error) throw error;

      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat?')) {
      try {
        const { error } = await supabase
          .from('eli5_chats')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) setActiveSessionId(null);
      } catch (err) {
        console.error("Error deleting chat:", err);
      }
    }
  };

  const startRenaming = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditingValue(session.title);
  };

  const handleRenameSave = async (id: string) => {
    if (editingValue.trim()) {
      try {
        const { error } = await supabase
          .from('eli5_chats')
          .update({ title: editingValue.trim() })
          .eq('id', id);

        if (error) throw error;

        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editingValue.trim() } : s));
      } catch (err) {
        console.error("Error updating title:", err);
      }
    }
    setEditingId(null);
  };

  const updateSessionMessages = async (sessionId: string, messages: Message[]) => {
    const currentSession = sessions.find(s => s.id === sessionId);
    if (!currentSession) return;

    let newTitle = currentSession.title;
    if ((currentSession.title === 'New Explanation') && messages.length > 0) {
      const firstMsg = messages[0].content;
      newTitle = firstMsg.length > 30 ? firstMsg.substring(0, 27) + '...' : firstMsg;
    }

    const updatedLastUpdated = Date.now();

    try {
      // Background sync to Supabase
      const { error } = await supabase
        .from('eli5_chats')
        .update({ 
          messages: messages, 
          title: newTitle, 
          last_updated: updatedLastUpdated 
        })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === sessionId) {
            return { ...s, messages, title: newTitle, lastUpdated: updatedLastUpdated };
          }
          return s;
        });
        return [...updated].sort((a, b) => b.lastUpdated - a.lastUpdated);
      });
    } catch (err) {
      console.error("Error syncing messages:", err);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-[#131314] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm animate-pulse">Retrieving your insights...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-[#e3e3e3]">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-[#1e1f20] flex flex-col transition-all duration-300 ease-in-out relative border-r border-gray-800`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full w-72">
            <div className="p-4">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#131314] hover:bg-[#282a2b] border border-gray-700 rounded-full text-sm font-medium transition-all group"
              >
                <i className="fas fa-plus text-blue-400 group-hover:scale-110 transition-transform"></i>
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
              <div className="text-xs font-semibold text-gray-500 px-4 py-2 uppercase tracking-wider">Recent Conversations</div>
              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSessionId === session.id ? 'bg-[#333537] text-white' : 'hover:bg-[#282a2b] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <i className="far fa-comment-alt text-xs opacity-70 shrink-0"></i>
                    {editingId === session.id ? (
                      <input
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleRenameSave(session.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSave(session.id)}
                        className="bg-[#131314] text-white text-sm px-2 py-1 rounded border border-blue-500 outline-none w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate text-sm">{session.title}</span>
                    )}
                  </div>
                  
                  {editingId !== session.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => startRenaming(session, e)}
                        className="p-1.5 hover:text-blue-400 hover:bg-[#3e4042] rounded transition-all"
                        title="Rename"
                      >
                        <i className="fas fa-pencil-alt text-[10px]"></i>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 hover:text-red-400 hover:bg-[#3e4042] rounded transition-all"
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-10 text-gray-600 text-sm italic">
                  No chats yet
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#1e1f20]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-sm font-bold shadow-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#282a2b] rounded-lg transition-all"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#131314] relative overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#282a2b] rounded-lg transition-all text-gray-400"
            >
              <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'}`}></i>
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                ELI5 Bot
                {activeSession && <span className="text-gray-600 font-normal">/</span>}
                {activeSession && <span className="text-gray-400 text-sm font-normal truncate max-w-[200px]">{activeSession.title}</span>}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold tracking-tighter px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">GEMINI 3 FLASH</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeSession ? (
            <ChatView 
              key={activeSession.id} 
              session={activeSession} 
              onUpdateMessages={(sessionId, msgs) => updateSessionMessages(sessionId, msgs)} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative bg-gradient-to-b from-[#1e1f20] to-[#131314] p-8 rounded-[40px] shadow-2xl border border-gray-800">
                   <i className="fas fa-brain text-7xl text-blue-500"></i>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                  Hi, {user.name.split(' ')[0]}
                </h2>
                <p className="text-xl text-gray-400 font-medium">
                  What complex topic should we simplify today?
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { q: "How do black holes work?", icon: "fa-atom" },
                  { q: "Explain quantum computing", icon: "fa-microchip" },
                  { q: "What is inflation?", icon: "fa-chart-line" },
                  { q: "Why is the sky blue?", icon: "fa-cloud-sun" }
                ].map((example) => (
                  <button
                    key={example.q}
                    onClick={() => {
                      handleNewChat().then(() => {
                        window.dispatchEvent(new CustomEvent('start-example-chat', { detail: example.q }));
                      });
                    }}
                    className="p-5 rounded-2xl border border-gray-800 bg-[#1e1f20] hover:bg-[#282a2b] text-left transition-all hover:border-blue-500/50 group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <i className={`fas ${example.icon} text-blue-500/50 group-hover:text-blue-400 transition-colors`}></i>
                      <p className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{example.q}</p>
                    </div>
                    <span className="text-xs text-gray-500 block">Get a simple, relatable explanation.</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleNewChat}
                className="mt-8 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-xl shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <i className="fas fa-comment-dots"></i>
                New Conversation
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
