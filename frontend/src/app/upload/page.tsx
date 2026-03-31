"use client";
import { useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setError("");
    setMessage("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchApi("/process/pdf", {
        method: "POST",
        body: formData,
      });
      setMessage(`Success! Added ${res.chunks_added} chunks to knowledge base.`);
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleYtUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetchApi("/process/youtube", {
        method: "POST",
        body: JSON.stringify({ url: ytUrl }),
      });
      setMessage(`Success! Added ${res.chunks_added} chunks to knowledge base.`);
      setYtUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to process YouTube URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold">Knowledge Base</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">← Back to Chat</Link>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col items-center justify-center space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">Add Context for AI</h2>
          <p className="text-gray-500 max-w-lg">Upload PDFs or add YouTube links. The AI will read and process them so you can ask questions about the content.</p>
        </div>

        {message && <div className="bg-green-50 text-green-700 p-4 rounded-lg w-full max-w-md text-center">{message}</div>}
        {error && <div className="bg-red-50 text-red-500 p-4 rounded-lg w-full max-w-md text-center">{error}</div>}

        <div className="w-full max-w-md space-y-8">
          {/* PDF Upload */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">📄 Upload PDF</h3>
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
              />
              <button 
                disabled={loading || !file}
                className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:bg-gray-300 transition"
              >
                {loading ? "Processing..." : "Process PDF"}
              </button>
            </form>
          </div>

          {/* YouTube Upload */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">📺 Process YouTube</h3>
            <form onSubmit={handleYtUpload} className="space-y-4">
              <input 
                type="url" 
                placeholder="https://youtube.com/watch?v=..." 
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                disabled={loading || !ytUrl}
                className="w-full bg-red-600 text-white rounded-lg py-2 font-medium hover:bg-red-700 disabled:bg-gray-300 transition"
              >
                {loading ? "Processing..." : "Process Video"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
