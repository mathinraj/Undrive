"use client";

import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle2, AlertCircle, FileUp } from "lucide-react";
import { uploadFile } from "@/lib/drive";
import { useVaultStore } from "@/lib/store";
import { formatFileSize } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function UploadZone() {
  const { data: session } = useSession();
  const { currentFolder, addFile, uploads, addUpload, updateUpload, removeUpload } =
    useVaultStore();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const counterRef = useRef(0);

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    counterRef.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    counterRef.current--;
    if (counterRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    counterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "pending"
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-violet-500 bg-violet-500/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
          <Upload className="h-6 w-6 text-violet-500" />
        </div>
        <div className="text-center">
          <p className="font-medium">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse
          </p>
        </div>
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
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {activeUploads.length > 0
                ? `Uploading ${activeUploads.length} file(s)...`
                : "Uploads"}
            </span>
            {uploads.every((u) => u.status === "done" || u.status === "error") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() =>
                  useVaultStore.getState().clearCompletedUploads()
                }
              >
                Clear all
              </Button>
            )}
          </div>

          {uploads.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={item.progress} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatFileSize(item.file.size)}
                  </span>
                </div>
              </div>
              {item.status === "done" && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              )}
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              {(item.status === "pending" || item.status === "uploading") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeUpload(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
