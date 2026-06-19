"use client";

import { useEffect } from "react";

type ScrollToLatestMessageProps = {
  latestMessageKey: string;
};

export function ScrollToLatestMessage({
  latestMessageKey,
}: ScrollToLatestMessageProps) {
  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto",
      });
    });

    const secondFrame = window.setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto",
      });
    }, 120);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(secondFrame);
    };
  }, [latestMessageKey]);

  return null;
}