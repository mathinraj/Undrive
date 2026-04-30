"use client";

import { useEffect, useRef } from "react";
import { usePasscodeStore } from "./passcode";

export function useAutoLock() {
  const config = usePasscodeStore((s) => s.config);
  const isLocked = usePasscodeStore((s) => s.isLocked);
  const lock = usePasscodeStore((s) => s.lock);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!config?.enabled || isLocked || config.autoLockMinutes <= 0) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock();
      }, config.autoLockMinutes * 60 * 1000);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((e) => window.addEventListener(e, resetTimer, true));
    resetTimer();

    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lock();
        }, Math.min(config.autoLockMinutes * 60 * 1000, 30000));
      } else {
        resetTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer, true));
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [config, isLocked, lock]);
}
