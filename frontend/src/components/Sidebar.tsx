"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Sidebar({ setChatId, currentChatId }: { setChatId: (id: number | null) => void; currentChatId: number | null }) {
  const [chats, setChats] = useState<{ id: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [pinnedChats, setPinnedChats] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadChats();
    const savedPinned = localStorage.getItem("pinnedChats");
    if (savedPinned) {
      try { setPinnedChats(JSON.parse(savedPinned)); } catch(e){}
    }
  }, []);

  const loadChats = async () => {
    try {
      const data = await fetchApi("/chat/history");
      setChats(data);
      if (data.length > 0 && currentChatId === null) {
        setChatId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createChat = async () => {
    const title = prompt("Enter chat title:");
    if (!title) return;
    try {
      const data = await fetchApi(`/chat/create?title=${encodeURIComponent(title)}`, { method: "POST" });
      setChats([...chats, data]);
      setChatId(data.id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChat = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this entire chat history? This cannot be undone.")) return;
    
    try {
      await fetchApi(`/chat/${id}`, { method: "DELETE" });
      const newChats = chats.filter(c => c.id !== id);
      setChats(newChats);
      if (currentChatId === id) {
        setChatId(newChats.length > 0 ? newChats[0].id : null);
      }
    } catch (e) {
      console.error("Failed to delete chat", e);
    }
  };

  const togglePin = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let newPinned;
    if (pinnedChats.includes(id)) {
      newPinned = pinnedChats.filter(p => p !== id);
    } else {
      if (pinnedChats.length >= 3) {
        alert("You can only pin up to 3 chats at a time.");
        setOpenMenuId(null);
        return;
      }
      newPinned = [...pinnedChats, id];
    }
    setPinnedChats(newPinned);
    localStorage.setItem("pinnedChats", JSON.stringify(newPinned));
    setOpenMenuId(null);
  };

  const shareChat = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/?chatId=${id}`);
    alert("Chat link copied to clipboard!");
    setOpenMenuId(null);
  };

  const sortedChats = [...chats].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.id);
    const bPinned = pinnedChats.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return b.id - a.id;
  });

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen p-4">
      <h1 className="text-xl font-bold mb-6">AI Assistant</h1>
      
      <button 
        onClick={createChat}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-4"
      >
        + New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400">Loading chats...</p>
        ) : chats.length === 0 ? (
          <p className="text-sm text-gray-400">No chats yet.</p>
        ) : (
          sortedChats.map(chat => (
            <div key={chat.id} className={`w-full flex items-center justify-between group rounded transition-colors relative ${currentChatId === chat.id ? "bg-gray-700" : "hover:bg-gray-800"}`} onMouseLeave={() => setOpenMenuId(null)}>
              <button
                onClick={() => setChatId(chat.id)}
                className="flex-1 text-left truncate px-3 py-2 flex items-center gap-2"
              >
                {pinnedChats.includes(chat.id) && <span>📌</span>}
                <span className="truncate">{chat.title}</span>
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chat.id ? null : chat.id); }}
                className={`p-2 text-gray-400 hover:text-white transition-opacity ${openMenuId === chat.id || currentChatId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title="Options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>

              {openMenuId === chat.id && (
                <div className="absolute top-full right-0 mt-1 w-36 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-20 overflow-hidden text-gray-300 font-medium text-sm">
                  <button 
                    onClick={(e) => togglePin(chat.id, e)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    {pinnedChats.includes(chat.id) ? "📌 Unpin Chat" : "📌 Pin Chat"}
                  </button>
                  <button 
                    onClick={(e) => shareChat(chat.id, e)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    🔗 Share Chat
                  </button>
                  <button 
                    onClick={(e) => { deleteChat(chat.id, e); setOpenMenuId(null); }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 border-t border-gray-700 transition-colors"
                  >
                    🗑️ Delete Chat
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-2">
        <a href="/upload" className="text-sm text-gray-400 hover:text-white">📄 Upload PDF / Video</a>
        <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 text-left">Sign Out</button>
      </div>
    </div>
  );
}
