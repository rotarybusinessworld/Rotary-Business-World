"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/shared/utils";
import { toImageSrc } from "@/shared/image";

const MAX_GALLERY = 12;

async function uploadFile(file: File, folder: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/**
 * Single-image uploader (logo or cover). Supports click and drag-and-drop.
 * When an image is set, shows an always-visible X (remove) button pinned top-right
 * and a "Replace" link below — both reachable on touch/mobile.
 */
export function ImageUpload({
  folder,
  value,
  onChange,
  aspect = "square",
  hint,
}: {
  folder: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "wide";
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadFile(file, folder));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  const height = aspect === "square" ? "h-32 w-32" : "h-36 w-full";

  return (
    <div>
      {value ? (
        /* ── Has image ──────────────────────────────────────────── */
        <div className={cn("flex", aspect === "square" ? "items-start gap-3" : "flex-col gap-2")}>
          {/* Preview box */}
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-[var(--radius)] border border-border",
              height,
              busy && "pointer-events-none opacity-70",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Image
              src={toImageSrc(value) ?? value}
              alt=""
              fill
              className="object-cover"
              sizes={aspect === "square" ? "128px" : "500px"}
            />
            {/* Always-visible X — reachable by tap on mobile */}
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove image"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Replace link — always visible, tap-friendly */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Replace image"
            className="mt-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {busy ? "Uploading…" : "Replace"}
          </button>
        </div>
      ) : (
        /* ── Empty state ────────────────────────────────────────── */
        <div
          className={cn(
            "relative overflow-hidden rounded-[var(--radius)] border-2 transition-colors duration-200",
            height,
            dragging
              ? "border-primary bg-primary/5"
              : "border-dashed border-border bg-muted hover:border-primary/50",
            busy && "pointer-events-none opacity-70",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Upload image"
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            {busy ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Uploading…</span>
              </>
            ) : dragging ? (
              <>
                <Upload className="h-6 w-6" />
                <span className="text-xs">Drop to upload</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">Upload</span>
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        id={`upload-${folder}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onPick}
      />

      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Multi-image gallery uploader (up to MAX_GALLERY = 12).
 * Supports click and drag-and-drop of multiple files onto the add tile.
 */
export function GalleryUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadFile(f, "gallery"));
      onChange([...value, ...urls].slice(0, MAX_GALLERY));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) handleFiles(files);
  }

  const remaining = MAX_GALLERY - value.length;
  const atLimit = remaining <= 0;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {/* Existing thumbnails */}
        {value.map((url) => (
          <div
            key={url}
            className="group relative h-24 w-24 overflow-hidden rounded-[var(--radius)] border border-border"
          >
            <Image src={toImageSrc(url) ?? url} alt="" fill className="object-cover" sizes="96px" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Add tile */}
        {!atLimit && (
          <div
            className={cn(
              "relative flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border-2 border-dashed transition-colors duration-200 cursor-pointer",
              dragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-primary",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Add photos"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium">
              {busy ? "Uploading…" : "Add"}
            </span>
          </div>
        )}

        {/* At-limit placeholder */}
        {atLimit && (
          <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border bg-muted/50">
            <span className="text-[10px] text-muted-foreground">Max 12</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id="upload-gallery"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <p className="mt-2 text-[11px] text-muted-foreground">
        {value.length}/{MAX_GALLERY} photos · JPG/PNG/WebP/GIF, up to 5 MB each
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
