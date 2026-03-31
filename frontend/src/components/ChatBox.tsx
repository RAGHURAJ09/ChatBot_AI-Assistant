"use client";
import { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import ReactMarkdown from "react-markdown";

type Message = { role: string; content: string };

export default function ChatBox({ chatId }: { chatId: number | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const msgs = await fetchApi(`/chat/${chatId}/messages`);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId || sending) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setSending(true);
    setInput("");

    try {
      const res = await fetchApi("/chat/message", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId, message: userMessage.content, use_web_search: useSearch }),
      });
      const aiMessage: Message = { role: "ai", content: res.message };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "ai", content: "Error: Could not get a response." }]);
    } finally {
      setSending(false);
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col pt-10 px-8 items-center justify-center bg-gray-50 text-gray-500">
        <h2 className="text-2xl mb-2 font-semibold">Welcome to AI Chat</h2>
        <p>Select a chat from the sidebar or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg p-4 font-sans text-[15px] leading-relaxed 
              ${msg.role === "user" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-800"}`}
            >
              {msg.role === "user" ? (
                <pre className="whitespace-pre-wrap font-sans indent-0">{msg.content}</pre>
              ) : (
                <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-lg p-4 flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 md:p-6 bg-white shrink-0">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4 items-center flex-col md:flex-row">
          <label className="flex items-center space-x-2 text-sm text-gray-600 self-start md:self-center">
            <input 
              type="checkbox" 
              checked={useSearch} 
              onChange={e => setUseSearch(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium whitespace-nowrap">Search Web</span>
          </label>
          <div className="flex w-full relative shadow-sm">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              placeholder="Message AI Assistant..." 
              className="flex-1 rounded-l-lg border border-gray-300 p-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
            <button 
              type="submit" 
              disabled={sending || !input.trim()}
              className="bg-blue-600 text-white px-8 rounded-r-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
