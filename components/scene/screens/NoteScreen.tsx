"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenShell } from "./ScreenShell";
import { supabase } from "@/lib/supabase";
import { roomByNickname, getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useRoom } from "../RoomContext";
import { Check, Heart, House, Trash } from "@phosphor-icons/react";

/** 방 주인이 그 글에 단 댓글 하나 (여러 개 가능). Supabase `guestbook.comments`(jsonb) 배열에 저장. */
type Comment = { author: string; message: string; at: string };

type Guestbook = {
  id: string;
  owner?: string;
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

function getRoomFromUrl() {
  if (typeof window === "undefined") return getRoom(null);
  return getRoom(new URLSearchParams(window.location.search).get("room"));
}

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
  const { visitRoom } = useRoom();
  const [room, setRoom] = useState(getRoomFromUrl);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(false);
  // 이번 세션에 하트 누른 글 — 중복 좋아요 방지 + 하트 채움 표시
  const [liked, setLiked] = useState<Set<string>>(new Set());
  // 글별 댓글 입력 초안 (방 주인 전용, 각 글에 상시 노출되는 입력칸 — 여러 번 작성 가능)
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isOwnRoom = room.id === HOME_ROOM_ID;

  useEffect(() => {
    let lastSearch = window.location.search;
    const syncRoom = () => {
      lastSearch = window.location.search;
      setRoom(getRoomFromUrl());
    };

    syncRoom();
    const interval = window.setInterval(() => {
      if (window.location.search !== lastSearch) syncRoom();
    }, 300);
    window.addEventListener("popstate", syncRoom);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", syncRoom);
    };
  }, []);

  /** 하트 — 낙관적 +1 후 Supabase에 반영. 같은 글은 세션당 1번만. */
  async function likePost(id: string, current: number) {
    if (liked.has(id)) return;
    setLiked((s) => new Set(s).add(id));
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
    await supabase.from("guestbook").update({ likes: current + 1 }).eq("id", id).eq("owner", room.id);
  }

  const loadGuestbook = useCallback(async () => {
    const { data, error } = await supabase
      .from("guestbook")
      .select("*")
      .eq("owner", room.id)
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data as Guestbook[]);
  }, [room.id]);

  useEffect(() => {
    setPosts([]);
    setLiked(new Set());
    setDrafts({});
    loadGuestbook();
  }, [loadGuestbook]);

  /** 현재 방 방명록에 작성. 닉네임은 로그인 유저(ME)로 자동 서명. */
  async function handlePost() {
    if (!message.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("guestbook").insert({
      owner: room.id,
      nickname: ME,
      message: message.trim(),
    });
    setLoading(false);
    if (error) {
      alert("Could not save your note.");
      console.error(error);
      return;
    }
    setMessage("");
    loadGuestbook();
  }

  /** 글 삭제 — 방 주인 또는 작성자 본인. RLS로 막히면 재로드로 복구. */
  async function deleteEntry(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("guestbook").delete().eq("id", id).eq("owner", room.id);
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
    const { error } = await supabase.from("guestbook").update({ comments: next }).eq("id", id).eq("owner", room.id);
    if (error) {
      console.error("댓글 저장 실패 — guestbook.comments(jsonb) 컬럼이 필요합니다.", error);
      loadGuestbook(); // 낙관적 변경 롤백
    }
  }

  /** 댓글 하나 삭제 (배열 인덱스). */
  async function deleteComment(id: string, index: number) {
    const next = (posts.find((p) => p.id === id)?.comments ?? []).filter((_, i) => i !== index);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: next } : p)));
    const { error } = await supabase.from("guestbook").update({ comments: next }).eq("id", id).eq("owner", room.id);
    if (error) {
      console.error(error);
      loadGuestbook();
    }
  }

  const visiblePosts = posts;

  // 댓글 입력 한 줄 (방 주인용) — 여러 번 작성 가능하도록 항상 노출
  const commentInputCls =
    "min-w-0 flex-1 rounded-lg border border-glassline bg-cream/[0.05] px-3 py-2 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";
  const paperInputCls =
    "w-full rounded-xl border border-amber/20 bg-cream/70 px-4 py-3 text-[13px] leading-relaxed text-inkdark placeholder:text-inkdark/45 outline-none focus:border-amber transition-colors";

  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <div className="relative w-[min(94vw,880px)] h-[min(82vh,660px)] rounded-[18px] border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[14px] bg-[radial-gradient(circle_at_18%_14%,theme(colors.amber/14%),transparent_25%),linear-gradient(105deg,theme(colors.cream),theme(colors.cream/90)_48%,theme(colors.creamdim/35)_50%,theme(colors.cream/90)_52%,theme(colors.cream)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[14px] opacity-45 bg-[linear-gradient(theme(colors.inkdark/5%)_1px,transparent_1px)] bg-[length:100%_28px]"
        />

        <div className="relative grid h-full grid-cols-1 md:grid-cols-[0.92fr_1.08fr] text-inkdark">
          <section className="min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-inkdark/10 px-5 py-5 sm:px-7 sm:py-6">
            <div className="shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-inkdark/55">Notebook</div>
              <h2 className="mt-1 font-serif text-3xl leading-none text-inkdark">Guestbook</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-inkdark/60">
                Leave a note in {room.ownerName}&apos;s room.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber/20 bg-cream/50 p-3">
              <Avatar nickname={ME} avatarUrl={getRoom(HOME_ROOM_ID).avatarUrl} size={38} />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-inkdark/45">Signed as</div>
                <div className="truncate text-sm font-bold text-inkdark">{ME}</div>
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Write a note for ${room.ownerName}...`}
                maxLength={160}
                className={`${paperInputCls} min-h-[140px] flex-1 resize-none`}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-inkdark/45">{message.length}/160</span>
                <button
                  onClick={handlePost}
                  disabled={loading || !message.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold text-inkdark transition hover:brightness-110 disabled:opacity-40"
                >
                  <Check size={16} weight="bold" aria-hidden />
                  Sign note
                </button>
              </div>
            </div>
          </section>

          <section className="min-h-0 flex flex-col px-5 py-5 sm:px-7 sm:py-6">
            <div className="shrink-0 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-inkdark/55">
                  {room.id}
                </div>
                <h3 className="mt-1 text-lg font-bold text-inkdark">{room.ownerName}&apos;s notes</h3>
              </div>
              <span className="shrink-0 rounded-full border border-inkdark/10 bg-cream/55 px-3 py-1 text-[11px] font-bold text-inkdark/55">
                {visiblePosts.length} notes
              </span>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 -mr-1">
              {visiblePosts.length === 0 && (
                <div className="rounded-xl border border-dashed border-inkdark/15 bg-cream/40 p-8 text-center text-inkdark/55">
                  <div className="font-serif text-xl text-inkdark">No guestbook yet</div>
                  <div className="mt-1 text-xs">Be the first to sign {room.ownerName}&apos;s guestbook.</div>
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
                  <div key={post.id} className="rounded-xl border border-inkdark/10 bg-bg/85 text-cream shadow-[0_12px_30px_rgba(0,0,0,0.18)] overflow-hidden">
                    {/* 상단 헤더 — 음영으로 본문과 구분. No.·이름·홈·날짜(좌) · 삭제(우) */}
                    <div className="flex items-center justify-between gap-2 bg-cream/[0.08] border-b border-cream/10 px-4 py-2">
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
                      <Avatar nickname={post.nickname} avatarUrl={linkedRoom?.avatarUrl} size={52} />
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
          </section>
        </div>
      </div>
    </ScreenShell>
  );
}
