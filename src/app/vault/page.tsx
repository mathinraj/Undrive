"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VaultHeader } from "@/components/vault-header";
import { FolderSidebar } from "@/components/folder-sidebar";
import { FileBrowser } from "@/components/file-browser";
import { UploadZone } from "@/components/upload-zone";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { listFiles, getStorageQuota } from "@/lib/drive";
import { useVaultStore } from "@/lib/store";
import { toast } from "sonner";

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setFiles, setQuota, isLoading, setIsLoading } = useVaultStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadVault = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      const [files, quota] = await Promise.all([
        listFiles(session.accessToken),
        getStorageQuota(session.accessToken),
      ]);
      setFiles(files);
      setQuota(quota);
    } catch (err) {
      if (session.error === "RefreshAccessTokenError") {
        toast.error("Session expired. Please sign in again.");
        router.push("/");
        return;
      }
      toast.error("Failed to load vault");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [session, setFiles, setQuota, setIsLoading, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.accessToken) {
      loadVault();
    }
  }, [session?.accessToken, loadVault]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">Loading your vault...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <VaultHeader onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 border-r shrink-0">
          <FolderSidebar />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <FolderSidebar className="mt-8" />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
          <UploadZone />
          <Separator />
          <FileBrowser />
        </main>
      </div>
    </div>
  );
}
