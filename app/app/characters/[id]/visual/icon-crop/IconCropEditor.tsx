"use client";

import { FormEvent, useRef, useState } from "react";
import { saveCroppedCharacterIcon } from "../actions";

type IconCropEditorProps = {
  characterId: string;
  imageId: string;
  imageUrl: string;
};

const ICON_SIZE = 512;

export function IconCropEditor({
  characterId,
  imageId,
  imageUrl,
}: IconCropEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const hiddenDataUrlRef = useRef<HTMLInputElement | null>(null);

  const [zoom, setZoom] = useState(1.25);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState("");

  function createCroppedImageDataUrl() {
    const image = imageRef.current;

    if (!image) {
      throw new Error("画像の読み込みが完了していません。");
    }

    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("画像の読み込みが完了していません。");
    }

    const canvas = document.createElement("canvas");
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("ブラウザで画像処理を開始できませんでした。");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, ICON_SIZE, ICON_SIZE);

    const sourceAspect = image.naturalWidth / image.naturalHeight;

    let baseWidth = ICON_SIZE;
    let baseHeight = ICON_SIZE;

    if (sourceAspect > 1) {
      baseHeight = ICON_SIZE;
      baseWidth = ICON_SIZE * sourceAspect;
    } else {
      baseWidth = ICON_SIZE;
      baseHeight = ICON_SIZE / sourceAspect;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const canvasOffsetX = (offsetX / 100) * (ICON_SIZE / 2);
    const canvasOffsetY = (offsetY / 100) * (ICON_SIZE / 2);

    const drawX = (ICON_SIZE - drawWidth) / 2 + canvasOffsetX;
    const drawY = (ICON_SIZE - drawHeight) / 2 + canvasOffsetY;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    return canvas.toDataURL("image/png");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setError("");

    try {
      const dataUrl = createCroppedImageDataUrl();

      if (!hiddenDataUrlRef.current) {
        throw new Error("保存用データの準備に失敗しました。");
      }

      hiddenDataUrlRef.current.value = dataUrl;
    } catch (caughtError) {
      event.preventDefault();

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "アイコン画像の作成に失敗しました。",
      );
    }
  }

  function resetCrop() {
    setZoom(1.25);
    setOffsetX(0);
    setOffsetY(0);
    setError("");
  }

  const imageTransform = `translate(calc(-50% + ${offsetX / 2}%), calc(-50% + ${
    offsetY / 2
  }%)) scale(${zoom})`;

  return (
    <div className="mt-8 space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold leading-6 text-red-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
        <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
          PREVIEW
        </p>
        <h2 className="mt-2 text-xl font-black">切り抜き位置を調整</h2>
        <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
          下の正方形が保存される範囲です。顔が中央に来るように調整してください。
        </p>

        <div className="mt-5 rounded-[2rem] border border-white/10 bg-white p-3">
          <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-white">
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
              style={{
                transform: imageTransform,
                transformOrigin: "center center",
              }}
              draggable={false}
            />

            <div className="pointer-events-none absolute inset-0 border-4 border-[#BEF264]/80" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-black/10" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-black/10" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#7DD3FC]/60 bg-white">
            <img
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
              style={{
                transform: imageTransform,
                transformOrigin: "center center",
              }}
              draggable={false}
            />
          </div>

          <div>
            <p className="text-sm font-black text-[#BAE6FD]">
              チャットアイコン表示イメージ
            </p>
            <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
              実際の画面では、丸や小さな正方形で表示される想定です。
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
        <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
          ADJUST
        </p>

        <div className="mt-5 space-y-5">
          <label className="block">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[#F4F1EA]">拡大</span>
              <span className="text-xs font-bold text-[#A7B0C0]">
                {zoom.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-3 w-full accent-[#BEF264]"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[#F4F1EA]">左右</span>
              <span className="text-xs font-bold text-[#A7B0C0]">
                {offsetX}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
              className="mt-3 w-full accent-[#7DD3FC]"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[#F4F1EA]">上下</span>
              <span className="text-xs font-bold text-[#A7B0C0]">
                {offsetY}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
              className="mt-3 w-full accent-[#FACC15]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={resetCrop}
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-[#D8DEE9] transition hover:bg-white/[0.08]"
        >
          位置をリセット
        </button>
      </section>

      <form action={saveCroppedCharacterIcon} onSubmit={handleSubmit}>
        <input type="hidden" name="characterId" value={characterId} />
        <input type="hidden" name="imageId" value={imageId} />
        <input
          ref={hiddenDataUrlRef}
          type="hidden"
          name="croppedImageDataUrl"
          value=""
          readOnly
        />

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
        >
          この切り抜きでアイコンにする
        </button>
      </form>
    </div>
  );
}