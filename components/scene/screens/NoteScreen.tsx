"use client";

import { useEffect, useState } from "react";
import { ScreenShell } from "./ScreenShell";
import { supabase } from "@/lib/supabase";
import { roomByNickname, getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useRoom } from "../RoomContext";
import { Check, Heart, House, Trash } from "@phosphor-icons/react";

/** 방 주인이 그 글에 단 댓글 하나 (여러 개 가능). Supabase `guestbook.comments`(jsonb) 배열에 저장. */
type Comment = { author: string; message: string; at: string };

type Guestbook = {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
  likes?: number;
  /** 방 주인 댓글 배열. Supabase `guestbook.comments`(jsonb, default '[]') 컬럼.
   *  컬럼이 없으면 undefined로 들어와 읽기는 깨지지 않는다(댓글 저장만 불가). */
  comments?: Comment[] | null;
};

// 로그인 유저 = 홈 방 주인 (목 로그인). 방명록 작성자 닉네임으로 사용.
const ME = getRoom(HOME_ROOM_ID).ownerName;

/** 작성 시각 — 영어 표기 (UI 기본 언어가 영어) */
const fmtWhen = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** 프로필 아바타 — 알려진 방 유저면 실제 사진, 없거나 로드 실패면 닉네임 이니셜 배지(테마 톤). */
function Avatar({ nickname, avatarUrl, size = 40 }: { nickname: string; avatarUrl?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = nickname.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="shrink-0 grid place-items-center rounded-lg overflow-hidden bg-ambersoft border border-glassline"
      style={{ width: size, height: size }}
    >
      {avatarUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-amber" style={{ fontSize: size * 0.42 }}>
          {initial}
        </span>
      )}
    </span>
  );
}

export function NoteScreen({ onClose }: { onClose: () => void }) {
  const { room, isOwnRoom, visitRoom } = useRoom();
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(false);
  // 이번 세션에 하트 누른 글 — 중복 좋아요 방지 + 하트 채움 표시
  const [liked, setLiked] = useState<Set<string>>(new Set());
  // 글별 댓글 입력 초안 (방 주인 전용, 각 글에 상시 노출되는 입력칸 — 여러 번 작성 가능)
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
    if (!error && data) setPosts(data as Guestbook[]);
  }

  useEffect(() => {
    loadGuestbook();
  }, []);

  /** 남의 방 방문 시에만 작성. 닉네임은 로그인 유저(ME)로 자동. 상단 상시 입력창에서 호출. */
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

  /** 글 삭제 — 방 주인 또는 작성자 본인. RLS로 막히면 재로드로 복구. */
  async function deleteEntry(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("guestbook").delete().eq("id", id);
    if (error) {
      console.error("글 삭제 실패", error);
      loadGuestbook();
    }
  }

  const setDraft = (id: string, val: string) => setDrafts((d) => ({ ...d, [id]: val }));

  /** 방 주인이 그 글에 댓글 추가 (여러 번 가능). comments(jsonb) 배열에 append. */
  async function addComment(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    const c: Comment = { author: room.ownerName, message: text, at: new Date().toISOString() };
    const next = [...(posts.find((p) => p.id === id)?.comments ?? []), c];
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: next } : p)));
    setDraft(id, "");
    const { error } = await supabase.from("guestbook").update({ comments: next }).eq("id", id);
    if (error) {
      console.error("댓글 저장 실패 — guestbook.comments(jsonb) 컬럼이 필요합니다.", error);
      loadGuestbook(); // 낙관적 변경 롤백
    }
  }

  /** 댓글 하나 삭제 (배열 인덱스). */
  async function deleteComment(id: string, index: number) {
    const next = (posts.find((p) => p.id === id)?.comments ?? []).filter((_, i) => i !== index);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: next } : p)));
    const { error } = await supabase.from("guestbook").update({ comments: next }).eq("id", id);
    if (error) {
      console.error(error);
      loadGuestbook();
    }
  }

  // 현재 방 주인 본인 글은 숨김 — 자기 방에서 자기 자신 visit 버튼이 뜨는 이상함 방지.
  // 방 id 기준으로 걸러 옛 닉네임(dada/ari)·새 닉네임(Jada/joh) 모두 이 방 주인 글이면 가림.
  // (전역 방명록이라 삭제하지 않고 방별로 가림 — 이 방 주인 글은 다른 방에선 보인다)
  const visiblePosts = posts.filter((p) => roomByNickname(p.nickname)?.id !== room.id);

  // 댓글 입력 한 줄 (방 주인용) — 여러 번 작성 가능하도록 항상 노출
  const commentInputCls =
    "min-w-0 flex-1 rounded-lg border border-glassline bg-cream/[0.05] px-3 py-2 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";

  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <div className="relative w-[min(92vw,760px)] h-[min(80vh,680px)] flex flex-col rounded-2xl border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden p-6">
        <div className="shrink-0 flex items-center justify-between gap-3 mb-4">
          <span className="text-sm font-bold uppercase tracking-widest text-creamdim">Guestbook</span>
          {visiblePosts.length > 0 && (
            <span className="text-[11px] font-semibold text-creamdim">{visiblePosts.length} notes</span>
          )}
        </div>

        {/* 방문 중 — 상단 상시 작성창 (댓글 입력과 동일한 형태로 일관성). 닉네임은 ME로 자동 서명 */}
        {!isOwnRoom && (
          <div className="shrink-0 mb-4 flex items-center gap-2">
            <Avatar nickname={ME} avatarUrl={getRoom(HOME_ROOM_ID).avatarUrl} size={36} />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              placeholder={`Leave a note for ${room.ownerName}...`}
              maxLength={80}
              className={commentInputCls}
            />
            <button
              onClick={handlePost}
              disabled={loading || !message.trim()}
              aria-label="Post note"
              className="shrink-0 grid place-items-center w-10 h-10 rounded-lg bg-amber text-inkdark hover:brightness-110 transition disabled:opacity-40"
            >
              <Check size={16} weight="bold" aria-hidden />
            </button>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 -mr-1">
          {visiblePosts.length === 0 && (
            <div className="rounded-xl border border-dashed border-glassline p-8 text-center text-creamdim">
              <div className="text-4xl">📖</div>
              <div className="mt-3 font-semibold text-cream">No guestbook yet</div>
              <div className="mt-1 text-xs">
                {isOwnRoom
                  ? "No one has signed your guestbook yet."
                  : `Be the first to sign ${room.ownerName}'s guestbook.`}
              </div>
            </div>
          )}

          {visiblePosts.map((post, idx) => {
            // 닉네임이 방 주인(dada/ari)과 같으면 그 방으로 방문 가능
            const linkedRoom = roomByNickname(post.nickname);
            const isLiked = liked.has(post.id);
            const canDelete = isOwnRoom || post.nickname.toLowerCase() === ME.toLowerCase();
            // 번호 — 먼저 쓴 글이 No.1, 최신이 가장 큰 번호 (목록은 최신순이라 뒤에서부터 셈)
            const no = visiblePosts.length - idx;
            const comments = post.comments ?? [];
            return (
              <div key={post.id} className="rounded-xl border border-white/20 bg-white/[0.14] backdrop-blur-sm overflow-hidden">
                {/* 상단 헤더 — 음영으로 본문과 구분. No.·이름·홈·날짜(좌) · 삭제(우) */}
                <div className="flex items-center justify-between gap-2 bg-white/[0.20] border-b border-white/15 px-4 py-2">
                  {/* No.·이름·홈·날짜 — 크기(12px)·세로정렬 통일, 색/굵기로만 위계 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-[12px] font-medium text-creamdim">No.{no}</span>
                    <span className="text-[12px] font-bold text-cream truncate">{post.nickname}</span>
                    {linkedRoom && (
                      <button
                        onClick={() => {
                          onClose();
                          visitRoom(linkedRoom.id);
                        }}
                        title={`Visit ${linkedRoom.ownerName}'s room`}
                        aria-label={`Visit ${linkedRoom.ownerName}'s room`}
                        className="shrink-0 leading-none text-amber hover:text-cream transition-colors"
                      >
                        <House size={14} weight="fill" aria-hidden />
                      </button>
                    )}
                    <span className="shrink-0 text-[12px] font-medium text-creamdim">{fmtWhen(post.created_at)}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => deleteEntry(post.id)}
                      className="shrink-0 text-[11px] font-bold text-creamdim hover:text-down transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* 본문 — 왼쪽 큰 프로필 + 오른쪽 내용 */}
                <div className="flex gap-4 p-4">
                  <Avatar nickname={post.nickname} avatarUrl={linkedRoom?.avatarUrl} size={60} />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-cream/90">
                      {post.message}
                    </p>
                    <button
                      onClick={() => likePost(post.id, post.likes ?? 0)}
                      disabled={isLiked}
                      aria-label={isLiked ? "Liked" : "Like this note"}
                      className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                        isLiked ? "text-amber" : "text-creamdim hover:text-amber"
                      }`}
                    >
                      <Heart size={15} weight={isLiked ? "fill" : "bold"} aria-hidden />
                      {post.likes ?? 0}
                    </button>
                  </div>
                </div>

                {/* 방 주인 댓글들 — 여러 개. 각 댓글: 이름 · owner · 날짜 + (내 방이면) 삭제 */}
                {comments.map((c, ci) => (
                  <div key={ci} className="border-t border-glassline bg-ambersoft px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] font-bold text-amber">{c.author}</span>
                        <span className="shrink-0 text-[12px] font-medium text-creamdim">· owner</span>
                        <span className="shrink-0 text-[12px] font-medium text-creamdim">{fmtWhen(c.at)}</span>
                      </div>
                      {isOwnRoom && (
                        <button
                          onClick={() => deleteComment(post.id, ci)}
                          aria-label="Delete reply"
                          className="shrink-0 text-creamdim hover:text-down transition-colors"
                        >
                          <Trash size={13} weight="bold" aria-hidden />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-cream/90">
                      {c.message}
                    </p>
                  </div>
                ))}

                {/* 댓글 입력 — 내 방에서 항상 노출 (여러 번 작성 가능, 작성 후에도 사라지지 않음) */}
                {isOwnRoom && (
                  <div className="flex items-center gap-2 border-t border-glassline bg-bg/25 px-4 py-2.5">
                    <input
                      value={drafts[post.id] ?? ""}
                      onChange={(e) => setDraft(post.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addComment(post.id);
                        }
                      }}
                      placeholder="Leave a reply..."
                      maxLength={80}
                      className={commentInputCls}
                    />
                    <button
                      onClick={() => addComment(post.id)}
                      disabled={!(drafts[post.id] ?? "").trim()}
                      aria-label="Post reply"
                      className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-amber text-inkdark hover:brightness-110 transition disabled:opacity-40"
                    >
                      <Check size={16} weight="bold" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}
