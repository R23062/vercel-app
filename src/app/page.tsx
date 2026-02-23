"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  // ブラウザ用クライアントの作成
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");

  // 1. 投稿を取得する関数
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data || []);
    }
  };

  useEffect(() => {
    fetchPosts();

    // 2. リアルタイム更新の設定
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. 投稿を送信する関数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const { error } = await supabase
      .from("posts")
      .insert([{ content, username: "匿名ユーザー" }]);
    
    if (error) {
      alert("投稿に失敗しました: " + error.message);
    } else {
      setContent("");
      // INSERTイベントが飛んでくるので、fetchPostsは自動で呼ばれます
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 font-sans">
      <header className="py-6 border-b mb-8">
        <h1 className="text-3xl font-extrabold text-blue-600">Mini X (掲示板)</h1>
      </header>
      
      {/* 投稿フォーム */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg shadow-sm">
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={3}
          placeholder="いまどうしてる？"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition"
          >
            ポストする
          </button>
        </div>
      </form>

      {/* 投稿一覧 */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-bold text-gray-800">{post.username}</span>
              <span className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString('ja-JP')}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>
        ))}
      </div>
    </main>
  );
}