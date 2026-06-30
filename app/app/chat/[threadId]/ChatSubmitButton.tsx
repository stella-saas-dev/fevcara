"use client";

import { useFormStatus } from "react-dom";

type ChatSubmitButtonProps = {
  disabled: boolean;
  isGroupChatLocked: boolean;
  isWaitingThreadCharacter: boolean;
};

export function ChatSubmitButton({
  disabled,
  isGroupChatLocked,
  isWaitingThreadCharacter,
}: ChatSubmitButtonProps) {
  const { pending } = useFormStatus();

  const isDisabled = disabled || pending;

  const label = pending
    ? "送信中…"
    : isGroupChatLocked
      ? "ロック中"
      : isWaitingThreadCharacter
        ? "待機中"
        : disabled
          ? "今月はここまで"
          : "送信";

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className="shrink-0 rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-6 py-3 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition active:scale-[0.98] hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {label}
    </button>
  );
}
