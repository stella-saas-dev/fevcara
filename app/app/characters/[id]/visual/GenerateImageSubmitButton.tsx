"use client";

import { useFormStatus } from "react-dom";

type GenerateImageSubmitButtonProps = {
  disabled?: boolean;
};

export function GenerateImageSubmitButton({
  disabled = false,
}: GenerateImageSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07111F]/25 border-t-[#07111F]" />
          <span>画像生成中…</span>
        </>
      ) : (
        "画像を生成する"
      )}
    </button>
  );
}
