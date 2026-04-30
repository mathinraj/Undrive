"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePasscodeStore } from "@/lib/passcode";
import { useAutoLock } from "@/lib/use-auto-lock";
import { LockScreen } from "@/components/lock-screen";

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const initialize = usePasscodeStore((s) => s.initialize);
  const isLocked = usePasscodeStore((s) => s.isLocked);
  const config = usePasscodeStore((s) => s.config);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useAutoLock();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  if (config?.enabled && isLocked) {
    return <LockScreen />;
  }

  return <>{children}</>;
}
