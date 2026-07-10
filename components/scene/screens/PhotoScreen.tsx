"use client";
import { useState, type ChangeEvent, type MouseEvent } from "react";
import { ScreenShell } from "./ScreenShell";
import { MAX_PHOTO_UPLOAD_BYTES, PHOTO_STORAGE_BUCKET, SAMPLE_PHOTO_URLS } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import { useRoom } from "../RoomContext";
import { ImageSquare, UploadSimple } from "@phosphor-icons/react";

/**
 * 액자 — 클릭 시 사진을 얇은 흰 액자에 끼운 것처럼 크게 보여준다.
 * 마우스를 올리면 돋보기(loupe)가 커서를 따라다니며 그 부분을 확대해 보여줌.
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 */
const LENS = 160; // 돋보기 지름(px)
const ZOOM = 1.5; // 확대 배율

export function PhotoScreen({ onClose }: { onClose: () => void }) {
  const { room, isOwnRoom, photoUrl, setPhotoUrl } = useRoom();
  const [lens, setLens] = useState<{
    x: number;
    y: number;
    bgSize: string;
    bgPos: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function savePhoto(nextUrl: string) {
    setLoading(true);
    setError("");
    const { error: saveError } = await supabase
      .from("room_photos")
      .upsert({ room_id: room.id, photo_url: nextUrl, updated_at: new Date().toISOString() });
    setLoading(false);

    if (saveError) {
      console.error("Failed to save room photo", saveError);
      setError("Could not save the room photo. Please try again.");
      return;
    }

    setPhotoUrl(nextUrl);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    setLoading(true);
    setError("");

    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${room.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error("Failed to upload room photo", uploadError);
      setLoading(false);
      setError("Could not upload the image. Please try again.");
      return;
    }

    const { data } = supabase.storage.from(PHOTO_STORAGE_BUCKET).getPublicUrl(path);
    await savePhoto(data.publicUrl);
  }

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLens({
      x,
      y,
      bgSize: `${rect.width * ZOOM}px ${rect.height * ZOOM}px`,
      // 커서 지점이 돋보기 중앙에 오도록 배경을 이동
      bgPos: `${-(x * ZOOM - LENS / 2)}px ${-(y * ZOOM - LENS / 2)}px`,
    });
  }

  return (
    <ScreenShell title="Photo" onClose={onClose}>
      {/* 얇은 흰 액자 — 사진을 그 안에 끼운 프린트처럼 */}
      <figure className="w-[min(94vw,840px)] overflow-hidden rounded-[4px] border-[3px] border-cream bg-cream shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]">
        <div
          className="relative flex h-[min(68vh,560px)] items-center justify-center leading-none [&:hover>img]:cursor-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setLens(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="A framed photo"
            draggable={false}
            onError={() => setPhotoUrl(SAMPLE_PHOTO_URLS[0])}
            className="block h-full w-full select-none object-contain"
          />

          {/* 돋보기 렌즈 */}
          {lens && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
              style={{
                width: LENS,
                height: LENS,
                left: lens.x - LENS / 2,
                top: lens.y - LENS / 2,
                backgroundImage: `url(${photoUrl})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: lens.bgSize,
                backgroundPosition: lens.bgPos,
              }}
            />
          )}
        </div>
      </figure>

      {isOwnRoom && (
        <div className="w-[min(94vw,840px)] rounded-xl border border-glassline bg-glass p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-creamdim">
              <ImageSquare size={16} weight="bold" aria-hidden />
              Choose photo
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-glassline bg-ambersoft px-4 py-2 text-xs font-bold text-cream transition-colors hover:border-amber hover:text-amber">
              <UploadSimple size={15} weight="bold" aria-hidden />
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={loading}
                className="sr-only"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {SAMPLE_PHOTO_URLS.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => savePhoto(src)}
                disabled={loading}
                aria-label={`Use sample photo ${index + 1}`}
                className={`aspect-video overflow-hidden rounded-lg border bg-cream transition ${
                  photoUrl === src ? "border-amber" : "border-glassline hover:border-creamdim"
                } disabled:opacity-60`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>

          <div className="mt-3 min-h-5 text-xs font-semibold">
            {loading && <span className="text-creamdim">Saving photo...</span>}
            {error && <span className="text-down">{error}</span>}
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
