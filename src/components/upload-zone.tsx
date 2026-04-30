"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, FileUp, Loader2, X } from "lucide-react";
import { uploadFile } from "@/lib/drive";
import { useVaultStore } from "@/lib/store";
import { formatFileSize } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function useFileUpload() {
  const { data: session } = useSession();
  const { currentFolder, addFile, addUpload, updateUpload } = useVaultStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => inputRef.current?.click();

  const processFiles = useCallback(
    async (fileList: FileList) => {
      if (!session?.accessToken) {
        toast.error("Not authenticated. Please sign in again.");
        return;
      }

      const files = Array.from(fileList);

      for (const file of files) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        if (file.size > 100 * 1024 * 1024) {
          toast.warning(`${file.name} is larger than 100MB. Upload may be slow.`);
        }

        addUpload({ id, file, progress: 0, status: "pending" });

        (async () => {
          updateUpload(id, { status: "uploading" });
          let attempts = 0;

          while (attempts < 3) {
            try {
              const driveFile = await uploadFile(
                session.accessToken,
                file,
                currentFolder,
                (loaded, total) => {
                  updateUpload(id, {
                    progress: Math.round((loaded / total) * 100),
                  });
                }
              );

              addFile(driveFile);
              updateUpload(id, { status: "done", progress: 100, driveFile });
              toast.success(`Uploaded ${file.name}`);
              return;
            } catch (err) {
              attempts++;
              if (attempts >= 3) {
                updateUpload(id, {
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                });
                toast.error(`Failed to upload ${file.name}`);
              } else {
                await new Promise((r) =>
                  setTimeout(r, 1000 * Math.pow(2, attempts))
                );
              }
            }
          }
        })();
      }
    },
    [session, currentFolder, addFile, addUpload, updateUpload]
  );

  const HiddenInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="hidden"
      onChange={(e) => {
        if (e.target.files) processFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return { openFilePicker, processFiles, HiddenInput };
}

export function DropOverlay({
  processFiles,
  children,
}: {
  processFiles: (files: FileList) => void;
  children: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  return (
    <div
      className="relative flex-1"
      onDragEnter={(e) => {
        e.preventDefault();
        counterRef.current++;
        setIsDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        counterRef.current--;
        if (counterRef.current === 0) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        counterRef.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
        }
      }}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-violet-500">
          <div className="flex flex-col items-center gap-2 text-violet-500">
            <FileUp className="h-10 w-10" />
            <p className="text-lg font-medium">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function UploadProgress() {
  const uploads = useVaultStore((s) => s.uploads);
  const removeUpload = useVaultStore((s) => s.removeUpload);

  useEffect(() => {
    const doneUploads = uploads.filter((u) => u.status === "done");
    if (doneUploads.length === 0) return;

    const timers = doneUploads.map((u) =>
      setTimeout(() => removeUpload(u.id), 2000)
    );

    return () => timers.forEach(clearTimeout);
  }, [uploads, removeUpload]);

  const visible = uploads.filter((u) => u.status !== "done" || true);
  const active = visible.filter(
    (u) => u.status === "uploading" || u.status === "pending"
  );

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-h-64 overflow-auto rounded-xl border bg-card shadow-lg lg:bottom-4">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium">
          {active.length > 0
            ? `Uploading ${active.length} file(s)...`
            : "Uploads complete"}
        </span>
        {active.length > 0 && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-2 space-y-1.5">
        {visible.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-opacity",
              item.status === "done" && "opacity-60"
            )}
          >
            <FileUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{item.file.name}</p>
              {(item.status === "uploading" || item.status === "pending") && (
                <Progress value={item.progress} className="h-1 mt-1" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {item.status === "done"
                ? "Done"
                : item.status === "error"
                  ? ""
                  : `${item.progress}%`}
            </span>
            {item.status === "error" && (
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
            {item.status === "error" && (
              <button
                onClick={() => removeUpload(item.id)}
                className="shrink-0"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
