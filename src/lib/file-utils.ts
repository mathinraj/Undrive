import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Presentation,
  type LucideIcon,
} from "lucide-react";

const MIME_ICON_MAP: [RegExp, LucideIcon][] = [
  [/^image\//, FileImage],
  [/^video\//, FileVideo],
  [/^audio\//, FileAudio],
  [/pdf/, FileText],
  [/spreadsheet|excel|csv/, FileSpreadsheet],
  [/presentation|powerpoint/, Presentation],
  [/zip|rar|tar|gz|7z|archive|compressed/, FileArchive],
  [/javascript|typescript|json|html|css|xml|code|python|java|ruby/, FileCode],
  [/text\//, FileText],
];

export function getFileIcon(mimeType: string): LucideIcon {
  for (const [pattern, icon] of MIME_ICON_MAP) {
    if (pattern.test(mimeType)) return icon;
  }
  return File;
}

export function formatFileSize(bytes: number | string): string {
  const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(b) || b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isPreviewable(mimeType: string): "image" | "pdf" | false {
  if (/^image\/(jpeg|jpg|png|gif|webp|svg)/.test(mimeType)) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return false;
}
