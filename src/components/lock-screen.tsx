"use client";

import { useState, useRef, useEffect } from "react";
import { Delete } from "lucide-react";
import { Logo } from "@/components/logo";
import { usePasscodeStore } from "@/lib/passcode";
import { cn } from "@/lib/utils";

export function LockScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const unlock = usePasscodeStore((s) => s.unlock);
  const maxLength = 6;

  const handleDigit = (digit: string) => {
    if (pin.length >= maxLength) return;
    const next = pin + digit;
    setError(false);
    setPin(next);

    if (next.length >= 4) {
      const success = unlock(next);
      if (!success && next.length >= maxLength) {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      handleDigit(e.key);
    } else if (e.key === "Backspace") {
      handleDelete();
    } else if (e.key === "Enter" && pin.length >= 4) {
      const success = unlock(pin);
      if (!success) {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 500);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Logo size={64} className="rounded-xl" />
          <h1 className="text-xl font-bold tracking-tight">Undrive</h1>
          <p className="text-sm text-muted-foreground">
            Enter your PIN to unlock
          </p>
        </div>

        {/* PIN dots */}
        <div
          className={cn(
            "flex items-center gap-3 transition-transform",
            shake && "animate-shake"
          )}
        >
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
                i < pin.length
                  ? error
                    ? "bg-destructive border-destructive"
                    : "bg-violet-500 border-violet-500"
                  : "border-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive -mt-4">Wrong PIN. Try again.</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key) => {
              if (key === "") return <div key="empty" />;

              if (key === "del") {
                return (
                  <button
                    key="del"
                    onClick={handleDelete}
                    className="flex h-16 items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                );
              }

              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  className="flex h-16 items-center justify-center rounded-2xl text-xl font-medium hover:bg-muted active:bg-muted/80 transition-colors"
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
