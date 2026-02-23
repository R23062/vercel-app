"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: true }); // 古い順（上から下へ）
    if (data) {
      // リプライを親投稿の直後に差し込む並び替え
      const threaded = data.filter(m => !m.parent_id).flatMap(parent => [
        parent,
        ...data.filter(child => child.parent_id === parent.id)
      ]);
      setMessages(threaded);
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel("realtime_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await supabase.from("posts").insert([{ 
      content, 
      name: name.trim() || "匿名ユーザー",
      parent_id: replyTo ? replyTo.id : null 
    }]);

    setContent("");
    setReplyTo(null);
  };

  const handleLike = async (id: number, currentLikes: number) => {
    await supabase.from("posts").update({ likes: (currentLikes || 0) + 1 }).eq("id", id);
  };

  const handleDelete = async (id: number) => {
    await supabase.from("posts").delete().eq("id", id);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* 左側：投稿ボード (固定) */}
      <aside className="w-1/3 bg-white border-r border-gray-200 p-8 flex flex-col shadow-lg z-10">
        <h1 className="text-2xl font-black text-blue-600 mb-6">Mini Message Board</h1>
        
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          {replyTo && (
            <div className="mb-3 text-xs bg-blue-100 text-blue-600 p-2 rounded-lg flex justify-between items-center animate-pulse">
              <span>@{replyTo.name} さんへ返信中</span>
              <button onClick={() => setReplyTo(null)} className="font-bold">✕</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text" placeholder="あんたのおなまえ"
              className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              value={name} onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none"
              rows={5} placeholder={replyTo ? "返信を入力..." : "メッセージを入力..."}
              value={content} onChange={(e) => setContent(e.target.value)}
            />
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95">
              {replyTo ? "返信を送信" : "新規投稿"}
            </button>
          </form>
        </div>
        <p className="mt-auto text-xs text-gray-400 text-center">© 2026 Mini Message Board</p>
      </aside>

      {/* 右側：掲示板タイムライン (スクロール可能) */}
      <main className="flex-1 overflow-y-auto p-8 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${
                msg.parent_id 
                ? 'ml-12 border-l-4 border-l-blue-400 bg-blue-50/30' 
                : 'border-gray-100 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.parent_id ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.name?.[0]}
                  </div>
                  <span className="font-bold text-sm">{msg.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {new Date(msg.created_at).toLocaleString("ja-JP", { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-10">
                {msg.content}
              </p>
              
              <div className="flex gap-4 mt-4 pl-10 border-t pt-3 border-gray-50">
                <button onClick={() => handleLike(msg.id, msg.likes)} className="group text-gray-400 hover:text-pink-500 flex items-center gap-1 text-xs transition-colors">
                  <span className="group-hover:scale-125 transition-transform">❤️</span> {msg.likes || 0}
                </button>
                <button onClick={() => setReplyTo(msg)} className="text-gray-400 hover:text-blue-500 flex items-center gap-1 text-xs transition-colors">
                  <span>💬</span>  返信
                </button>
                <button onClick={() => handleDelete(msg.id)} className="text-gray-300 hover:text-red-400 text-xs ml-auto transition-colors">
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-20 text-gray-400">まだ投稿がありません。最初のメッセージを送りましょう！</div>
          )}
        </div>
      </main>
    </div>
  );
}