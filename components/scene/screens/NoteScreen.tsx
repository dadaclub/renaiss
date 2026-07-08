"use client";

import { useEffect, useState } from "react";
import { ScreenShell } from "./ScreenShell";
import { supabase } from "@/lib/supabase";
import { roomByNickname, getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useRoom } from "../RoomContext";
import { Heart } from "@phosphor-icons/react";

type Guestbook = {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
  likes?: number;
};

// 로그인 유저 = 홈 방 주인 (목 로그인). 방명록 작성자 닉네임으로 사용.
const ME = getRoom(HOME_ROOM_ID).ownerName;

export function NoteScreen({ onClose }: { onClose: () => void }) {
  const { room, isOwnRoom, visitRoom } = useRoom();
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(false);
  // 이번 세션에 하트 누른 글 — 중복 좋아요 방지 + 하트 채움 표시
  const [liked, setLiked] = useState<Set<string>>(new Set());

  /** 하트 — 낙관적 +1 후 Supabase에 반영. 같은 글은 세션당 1번만. */
  async function likePost(id: string, current: number) {
    if (liked.has(id)) return;
    setLiked((s) => new Set(s).add(id));
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
    await supabase.from("guestbook").update({ likes: current + 1 }).eq("id", id);
  }

  async function loadGuestbook() {
    const { data, error } = await supabase
      .from("guestbook")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data);
  }

  useEffect(() => {
    loadGuestbook();
  }, []);

  /** 남의 방 방문 시에만 작성. 닉네임은 로그인 유저(ME)로 자동. */
  async function handlePost() {
    if (!message.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("guestbook").insert({ nickname: ME, message });
    setLoading(false);
    if (error) {
      alert("저장 실패 😢");
      console.error(error);
      return;
    }
    setMessage("");
    loadGuestbook();
  }

  // 현재 방 주인 본인 글은 숨김 — 자기 방에서 자기 자신 visit 버튼이 뜨는 이상함 방지.
  // (전역 방명록이라 삭제하지 않고 방별로 가림 — dada 글은 ari 방에선 보인다)
  const visiblePosts = posts.filter(
    (p) => p.nickname.toLowerCase() !== room.ownerName.toLowerCase()
  );

  // 방명록 목록 (내 방·방문 공통)
  const notesList = (
    <>
      <div className="text-sm font-bold uppercase tracking-widest text-creamdim mb-4">Guestbook</div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {visiblePosts.length === 0 && (
          <div className="rounded-xl border border-dashed border-glassline p-8 text-center text-creamdim">
            <div className="text-4xl">📖</div>
            <div className="mt-3 font-semibold text-cream">No guestbook yet</div>
            <div className="mt-1 text-xs">No notes yet.</div>
          </div>
        )}

        {visiblePosts.map((post) => {
          // 닉네임이 방 주인(dada/ari)과 같으면 그 방으로 방문 가능
          const linkedRoom = roomByNickname(post.nickname);
          const isLiked = liked.has(post.id);
          return (
            <div key={post.id} className="rounded-xl border border-glassline p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-cream truncate">{post.nickname}</span>
                  {/* visit — 방 주인 닉네임에만. 누르면 그 방으로 이동 */}
                  {linkedRoom && (
                    <button
                      onClick={() => {
                        onClose();
                        visitRoom(linkedRoom.id);
                      }}
                      title={`Visit ${linkedRoom.ownerName}'s room`}
                      className="shrink-0 px-2 py-0.5 rounded-full border border-amber/40 text-amber text-[10px] font-bold uppercase tracking-wider hover:bg-amber hover:text-inkdark transition-colors"
                    >
                      visit
                    </button>
                  )}
                </div>
                <div className="shrink-0 text-xs text-creamdim">
                  {new Date(post.created_at).toLocaleDateString("ko-KR")}
                </div>
              </div>

              <div className="mt-2 whitespace-pre-wrap break-words text-creamdim">{post.message}</div>

              {/* 하트(좋아요) */}
              <button
                onClick={() => likePost(post.id, post.likes ?? 0)}
                disabled={isLiked}
                aria-label={isLiked ? "Liked" : "Like this note"}
                className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                  isLiked ? "text-amber" : "text-creamdim hover:text-amber"
                }`}
              >
                <Heart size={15} weight={isLiked ? "fill" : "bold"} aria-hidden />
                {post.likes ?? 0}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );

  // 내 방: 남들이 남긴 글만 (작성 폼 없음). 방문 시: 왼쪽 작성 + 오른쪽 목록.
  if (isOwnRoom) {
    return (
      <ScreenShell title="Guestbook" onClose={onClose}>
        <div className="relative w-[min(92vw,560px)] h-[min(78vh,560px)] flex flex-col rounded-2xl border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden p-6">
          {notesList}
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <div className="relative w-[min(92vw,920px)] h-[min(78vh,560px)] flex rounded-2xl border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Spine */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-6 -translate-x-1/2 bg-gradient-to-r from-black/25 via-black/10 to-black/25" />

        {/* Left page: write (닉네임 없이 — 로그인 유저로 자동 서명) */}
        <div className="relative w-1/2 h-full border-r border-glassline/60 p-6 flex flex-col">
          <div className="text-sm font-bold uppercase tracking-widest text-creamdim mb-4">
            Leave a note
          </div>
          <div className="text-[12px] text-creamdim mb-3">
            Signing as <span className="text-amber font-bold">{ME}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message..."
              maxLength={80}
              className="w-full flex-1 rounded-lg border border-glassline bg-transparent px-4 py-3 text-cream outline-none resize-none"
            />
            <div className="mt-1 text-right text-xs text-creamdim">{message.length}/80</div>
          </div>
          <button
            onClick={handlePost}
            disabled={loading || !message.trim()}
            className="mt-4 w-full rounded-lg bg-amber py-3 font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>

        {/* Right page: guestbook list */}
        <div className="relative w-1/2 h-full p-6 flex flex-col">{notesList}</div>
      </div>
    </ScreenShell>
  );
}
