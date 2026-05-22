"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VaultHeader } from "@/components/vault-header";
import { FolderSidebar } from "@/components/folder-sidebar";
import { FileBrowser } from "@/components/file-browser";
import { TrashView } from "@/components/trash-view";
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
} from "@/lib/drive";
import { useVaultStore } from "@/lib/store";
import { toast } from "sonner";

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const store = useVaultStore();
  const { setFiles, setQuota, isLoading, setIsLoading } = store;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { openFilePicker, processFiles, HiddenInput } = useFileUpload();
  const hasLoadedRef = useRef(false);
  const prevFoldersRef = useRef<string>("");

  const loadVault = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const [files, quota, savedFolders] = await Promise.all([
        listFiles(token),
        getStorageQuota(token),
        loadFolderRegistry(token),
      ]);
      setFiles(files, savedFolders);
      setQuota(quota);
    } catch (err) {
      toast.error("Failed to load vault");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setFiles, setQuota, setIsLoading]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Load vault only once when we first get a valid token
  useEffect(() => {
    if (session?.accessToken && !hasLoadedRef.current) {
      if (session.error === "RefreshAccessTokenError") {
        toast.error("Session expired. Please sign in again.");
        router.push("/");
        return;
      }
      hasLoadedRef.current = true;
      loadVault(session.accessToken);
    }
  }, [session?.accessToken, session?.error, loadVault, router]);

  // Auto-clean expired trash items (>7 days) after initial load
  useEffect(() => {
    if (!session?.accessToken || isLoading || !hasLoadedRef.current) return;
    const expiredIds = useVaultStore.getState().cleanExpiredTrash();
    if (expiredIds.length > 0) {
      Promise.all(
        expiredIds.map((id) => driveDeleteFile(session.accessToken, id))
      ).catch(console.error);
    }
  }, [session?.accessToken, isLoading]);

  // Persist folders to Drive whenever they change (debounced by checking serialized value)
  useEffect(() => {
    if (!session?.accessToken || isLoading || !hasLoadedRef.current) return;
    const folders = useVaultStore.getState().folders;
    const serialized = JSON.stringify(folders);
    if (serialized === prevFoldersRef.current) return;
    prevFoldersRef.current = serialized;
    saveFolderRegistry(session.accessToken, folders).catch(console.error);
  }, [store.folders, session?.accessToken, isLoading]);

  if (status === "loading" || (isLoading && !hasLoadedRef.current)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
            {store.activeView === "trash" ? <TrashView /> : <FileBrowser />}
          </main>
        </DropOverlay>
      </div>

      {HiddenInput}
      <FabMenu onUploadClick={openFilePicker} />
      <UploadProgress />
    </div>
  );
}
