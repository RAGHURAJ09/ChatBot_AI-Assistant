"use client";
import { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import ReactMarkdown from "react-markdown";

type Message = { id?: number; role: string; content: string };

export default function ChatBox({ chatId }: { chatId: number | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await fetchApi(`/chat/message/${id}`, { method: "DELETE" });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error("Failed to delete message");
    }
  };

  const startEdit = (msg: Message) => {
    if (msg.id) {
      setEditingId(msg.id);
      setEditContent(msg.content);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await fetchApi(`/chat/message/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent }),
      });
      await loadMessages();
      setEditingId(null);
      setEditContent("");
    } catch (e) {
      console.error("Failed to edit message");
    }
  };

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

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setMessages(prev => {
        const newArr = [...prev];
        const lastUserMsgIndex = newArr.length - 1;
        if (newArr[lastUserMsgIndex] && newArr[lastUserMsgIndex].role === "user" && !newArr[lastUserMsgIndex].id) {
            newArr[lastUserMsgIndex] = { ...newArr[lastUserMsgIndex], id: res.user_message_id };
        }
        return [...newArr, { id: res.ai_message_id, role: "ai", content: res.message }];
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "ai", content: "Oops, something went wrong on my end while trying to answer that." }]);
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
          <div key={msg.id ? `msg-${msg.id}` : `temp-${i}`} className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {editingId === msg.id ? (
                <div className="flex flex-col gap-2 w-full p-4 rounded-xl border border-gray-200 shadow-sm bg-white">
                  <textarea 
                    value={editContent} 
                    onChange={e => setEditContent(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                    }}
                    className="text-gray-800 p-3 rounded-lg bg-gray-50 border border-gray-200 min-w-[300px] min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                  />
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => setEditingId(null)} className="text-sm px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="text-sm px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Save & Submit</button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`rounded-2xl px-5 py-3.5 font-sans text-[15px] leading-relaxed relative group/bubble pr-12
                    ${msg.role === "user" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-800"}`}
                  onMouseLeave={() => setOpenMenuId(null)}
                >
                  {msg.role === "user" ? (
                    <pre className="whitespace-pre-wrap font-sans indent-0">{msg.content}</pre>
                  ) : (
                    <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  
                  {msg.id && (
                    <div className={`absolute top-2 right-2 ${openMenuId === msg.id ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'} transition-opacity`}>
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id!)}
                        className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${msg.role === "user" ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
                        title="Options"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {openMenuId === msg.id && (
                        <div className={`absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-10 overflow-hidden text-gray-700 font-medium`}>
                          {msg.role !== "user" && (
                            <button 
                              onClick={() => { navigator.clipboard.writeText(msg.content); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              Copy Text
                            </button>
                          )}
                          {msg.role === "user" && (
                            <button 
                              onClick={() => { startEdit(msg); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              Edit
                            </button>
                          )}
                          <button 
                            onClick={() => { handleDelete(msg.id!); setOpenMenuId(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors ${msg.role === "user" ? "border-t border-gray-50" : ""}`}
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
            <textarea 
              value={input} 
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = '56px';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!sending && input.trim()) {
                    sendMessage();
                    const target = e.target as HTMLTextAreaElement;
                    setTimeout(() => { target.style.height = '56px'; }, 10);
                  }
                }
              }}
              placeholder="Message AI Assistant... (Shift+Enter for new line)" 
              rows={1}
              className="flex-1 rounded-l-lg border border-gray-300 p-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-none"
              style={{ minHeight: '56px', maxHeight: '150px', overflowY: 'auto' }}
            />
            <button 
              type="button" 
              onClick={() => sendMessage()}
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
