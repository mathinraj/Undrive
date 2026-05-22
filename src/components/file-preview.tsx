"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Loader2,
  X,
  Trash2,
  FolderInput,
  Folder,
  Calendar,
  HardDrive,
  FileType,
} from "lucide-react";
import { downloadFile } from "@/lib/drive";
import type { DriveFile } from "@/lib/drive";
import {
  getFileIcon,
  isPreviewable,
  formatFileSize,
  formatDate,
} from "@/lib/file-utils";
import { toast } from "sonner";

interface FileDetailPanelProps {
  file: DriveFile | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, name: string) => void;
}

export function FileDetailPanel({
  file,
  onClose,
  onDelete,
  onMove,
}: FileDetailPanelProps) {
  const { data: session } = useSession();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || !session?.accessToken) return;

    const previewType = isPreviewable(file.mimeType);
    if (!previewType) {
      setBlobUrl(null);
      return;
    }

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
  }, [file?.id, session]);

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

  const Icon = getFileIcon(file.mimeType);
  const previewType = isPreviewable(file.mimeType);
  const folder = file.appProperties?.folder || "/";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="text-sm font-semibold truncate">{file.name}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && previewType === "image" && blobUrl && (
          <div className="p-4">
            <img
              src={blobUrl}
              alt={file.name}
              className="w-full rounded-lg object-contain max-h-[40vh] bg-muted/30"
            />
          </div>
        )}

        {!loading && previewType === "pdf" && blobUrl && (
          <div className="p-4">
            <iframe
              src={blobUrl}
              title={file.name}
              className="w-full h-[40vh] rounded-lg border"
            />
          </div>
        )}

        {!loading && !previewType && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Icon className="h-16 w-16 opacity-30" />
            <p className="text-sm">No preview available</p>
          </div>
        )}

        <Separator />

        {/* File details */}
        <div className="p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Details
          </h3>
          <div className="space-y-3">
            <DetailRow
              icon={<FileType className="h-4 w-4" />}
              label="Type"
              value={file.mimeType}
            />
            <DetailRow
              icon={<HardDrive className="h-4 w-4" />}
              label="Size"
              value={formatFileSize(file.size)}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Uploaded"
              value={formatDate(file.createdTime)}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Modified"
              value={formatDate(file.modifiedTime)}
            />
            <DetailRow
              icon={<Folder className="h-4 w-4 text-blue-400" />}
              label="Location"
              value={folder === "/" ? "My Drive" : folder}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t space-y-2">
        <Button className="w-full gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onMove(file.id, file.name)}
          >
            <FolderInput className="h-4 w-4" />
            Move
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 text-destructive"
            onClick={() => onDelete(file.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-all">{value}</p>
      </div>
    </div>
  );
}
