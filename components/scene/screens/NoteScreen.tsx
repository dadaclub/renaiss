"use client";

import { useEffect, useState } from "react";
import { ScreenShell } from "./ScreenShell";
import { supabase } from "@/lib/supabase";

type Guestbook = {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
};

export function NoteScreen({ onClose }: { onClose: () => void }) {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadGuestbook() {
    const { data, error } = await supabase
      .from("guestbook")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
  }

  useEffect(() => {
    loadGuestbook();
  }, []);

  async function handlePost() {
    if (!nickname.trim() || !message.trim()) {
      alert("닉네임과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("guestbook").insert({
      nickname,
      message,
    });

    setLoading(false);

    if (error) {
      alert("저장 실패 😢");
      console.error(error);
      return;
    }

    setNickname("");
    setMessage("");

    loadGuestbook();
  }

  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <div className="relative w-[min(92vw,920px)] h-[min(78vh,560px)] flex rounded-2xl border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden">

        {/* Spine */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-6 -translate-x-1/2 bg-gradient-to-r from-black/25 via-black/10 to-black/25" />

        {/* Left page: write */}
        <div className="relative w-1/2 h-full border-r border-glassline/60 p-6 flex flex-col">
          <div className="text-sm font-bold uppercase tracking-widest text-creamdim mb-4">
            Write a note
          </div>

          <div>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              maxLength={8}
              className="w-full rounded-lg border border-glassline bg-transparent px-4 py-3 text-cream outline-none"
            />
            <div className="mt-1 text-right text-xs text-creamdim">
              {nickname.length}/8
            </div>
          </div>

          <div className="mt-4 flex-1 flex flex-col">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message..."
              maxLength={80}
              className="w-full flex-1 rounded-lg border border-glassline bg-transparent px-4 py-3 text-cream outline-none resize-none"
            />
            <div className="mt-1 text-right text-xs text-creamdim">
              {message.length}/80
            </div>
          </div>

          <button
            onClick={handlePost}
            disabled={loading || !nickname.trim() || !message.trim()}
            className="mt-4 w-full rounded-lg bg-amber py-3 font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>

        {/* Right page: guestbook list */}
        <div className="relative w-1/2 h-full p-6 flex flex-col">
          <div className="text-sm font-bold uppercase tracking-widest text-creamdim mb-4">
            Guestbook
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {posts.length === 0 && (
              <div className="rounded-xl border border-dashed border-glassline p-8 text-center text-creamdim">
                <div className="text-4xl">📖</div>
                <div className="mt-3 font-semibold text-cream">
                  No guestbook yet
                </div>
                <div className="mt-1 text-xs">
                  Be the first to leave a message!
                </div>
              </div>
            )}

            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-glassline p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-cream">
                    {post.nickname}
                  </div>
                  <div className="text-xs text-creamdim">
                    {new Date(post.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>

                <div className="mt-2 whitespace-pre-wrap break-words text-creamdim">
                  {post.message}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScreenShell>
  );
}