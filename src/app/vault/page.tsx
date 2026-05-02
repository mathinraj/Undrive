"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VaultHeader } from "@/components/vault-header";
import { FolderSidebar } from "@/components/folder-sidebar";
import { FileBrowser } from "@/components/file-browser";
import {
  useFileUpload,
  DropOverlay,
  UploadProgress,
} from "@/components/upload-zone";
import { FabMenu } from "@/components/fab-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import {
  listFiles,
  getStorageQuota,
  loadFolderRegistry,
  saveFolderRegistry,
  deleteFile as driveDeleteFile,
  updateFileMetadata,
} from "@/lib/drive";
import { useVaultStore } from "@/lib/store";
import { toast } from "sonner";

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const store = useVaultStore();
  const { setFiles, setQuota, setFolders, isLoading, setIsLoading } = store;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { openFilePicker, processFiles, HiddenInput } = useFileUpload();

  const loadVault = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      const [files, quota, savedFolders] = await Promise.all([
        listFiles(session.accessToken),
        getStorageQuota(session.accessToken),
        loadFolderRegistry(session.accessToken),
      ]);
      setFolders(savedFolders);
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
  }, [session, setFiles, setQuota, setFolders, setIsLoading, router]);

  // Auto-clean expired trash items (>7 days) on load
  useEffect(() => {
    if (!session?.accessToken || isLoading) return;
    const expiredIds = useVaultStore.getState().cleanExpiredTrash();
    if (expiredIds.length > 0) {
      Promise.all(
        expiredIds.map((id) => driveDeleteFile(session.accessToken, id))
      ).catch(console.error);
    }
  }, [session?.accessToken, isLoading]);

  // Persist folders to Drive whenever they change
  useEffect(() => {
    if (!session?.accessToken || isLoading) return;
    const folders = useVaultStore.getState().folders;
    saveFolderRegistry(session.accessToken, folders).catch(console.error);
  }, [store.folders, session?.accessToken, isLoading]);

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
          <p className="text-sm text-muted-foreground">
            Loading your vault...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <VaultHeader onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        <aside className="hidden lg:block w-56 border-r shrink-0">
          <FolderSidebar onUploadClick={openFilePicker} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <FolderSidebar
              className="mt-8"
              onUploadClick={() => {
                setSidebarOpen(false);
                setTimeout(openFilePicker, 200);
              }}
            />
          </SheetContent>
        </Sheet>

        <DropOverlay processFiles={processFiles}>
          <main className="p-4 lg:p-6 space-y-4 overflow-auto min-h-[calc(100vh-3.5rem)]">
            <FileBrowser />
          </main>
        </DropOverlay>
      </div>

      {HiddenInput}
      <FabMenu onUploadClick={openFilePicker} />
      <UploadProgress />
    </div>
  );
}
