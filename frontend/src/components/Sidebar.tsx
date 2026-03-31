"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Sidebar({ setChatId, currentChatId }: { setChatId: (id: number) => void; currentChatId: number | null }) {
  const [chats, setChats] = useState<{ id: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadChats();
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
          chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setChatId(chat.id)}
              className={`w-full text-left truncate px-3 py-2 rounded ${currentChatId === chat.id ? "bg-gray-700" : "hover:bg-gray-800"}`}
            >
              {chat.title}
            </button>
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
