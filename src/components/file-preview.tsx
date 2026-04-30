"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { downloadFile } from "@/lib/drive";
import type { DriveFile } from "@/lib/drive";
import { isPreviewable, formatFileSize, formatDate } from "@/lib/file-utils";
import { toast } from "sonner";

interface FilePreviewProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreview({ file, open, onOpenChange }: FilePreviewProps) {
  const { data: session } = useSession();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || !open || !session?.accessToken) return;

    const previewType = isPreviewable(file.mimeType);
    if (!previewType) return;

    let url: string | null = null;
    setLoading(true);

    downloadFile(session.accessToken, file.id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => toast.error("Failed to load preview"))
      .finally(() => setLoading(false));

    return () => {
      if (url) URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [file, open, session]);

  const handleDownload = async () => {
    if (!file || !session?.accessToken) return;
    try {
      const blob = await downloadFile(session.accessToken, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${file.name}`);
    } catch {
      toast.error("Failed to download file");
    }
  };

  if (!file) return null;

  const previewType = isPreviewable(file.mimeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-8">
            <span className="truncate">{file.name}</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </DialogTitle>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.createdTime)}</span>
            <span>{file.mimeType}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && previewType === "image" && blobUrl && (
            <img
              src={blobUrl}
              alt={file.name}
              className="max-w-full max-h-[60vh] mx-auto rounded-lg object-contain"
            />
          )}

          {!loading && previewType === "pdf" && blobUrl && (
            <iframe
              src={blobUrl}
              title={file.name}
              className="w-full h-[60vh] rounded-lg border"
            />
          )}

          {!loading && !previewType && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <p>Preview not available for this file type.</p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
