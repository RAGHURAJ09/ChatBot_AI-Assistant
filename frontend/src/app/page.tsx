"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatBox from "@/components/ChatBox";
import { useRouter } from "next/navigation";

export default function Home() {
  const [chatId, setChatId] = useState<number | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthLoading(false);
    }
  }, [router]);

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar setChatId={setChatId} currentChatId={chatId} />
      <ChatBox chatId={chatId} />
    </div>
  );
}
