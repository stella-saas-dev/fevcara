"use client";

import { useEffect } from "react";

type ScrollToLatestMessageProps = {
  latestMessageKey: string;
};

export function ScrollToLatestMessage({
  latestMessageKey,
}: ScrollToLatestMessageProps) {
  useEffect(() => {
    const scrollToLatest = () => {
      const container = document.getElementById("chat-scroll-container");
      const marker = document.getElementById("chat-latest-message");

      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "auto",
        });
        return;
      }

      if (marker) {
        marker.scrollIntoView({
          block: "end",
          behavior: "auto",
        });
        return;
      }

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto",
      });
    };

    const firstFrame = window.requestAnimationFrame(scrollToLatest);
    const secondFrame = window.setTimeout(scrollToLatest, 160);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(secondFrame);
    };
  }, [latestMessageKey]);

  return null;
}
