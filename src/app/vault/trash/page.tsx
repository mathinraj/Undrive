"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  MoreVertical,
  Loader2,
  Trash,
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import {
  deleteFile as driveDeleteFile,
  updateFileMetadata,
} from "@/lib/drive";
import { getFileIcon, formatFileSize, formatDate } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TrashPage() {
  const { data: session } = useSession();
  const { trash, restoreFromTrash, permanentlyDelete, emptyTrash } =
    useVaultStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async (ids: string[]) => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      await Promise.all(
        ids.map((id) => {
          const item = trash.find((t) => t.file.id === id);
          return updateFileMetadata(session.accessToken, id, {
            appProperties: {
              folder: item?.originalFolder || "/",
              trashed: "",
              trashedAt: "",
              originalFolder: "",
            },
          });
        })
      );
      restoreFromTrash(ids);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`Restored ${ids.length} file(s)`);
    } catch {
      toast.error("Failed to restore files");
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (ids: string[]) => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      await Promise.all(ids.map((id) => driveDeleteFile(session.accessToken, id)));
      permanentlyDelete(ids);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`Permanently deleted ${ids.length} file(s)`);
    } catch {
      toast.error("Failed to delete files");
    } finally {
      setProcessing(false);
      setShowDeleteConfirm(false);
      setDeleteTargetIds([]);
    }
  };

  const handleEmptyTrash = async () => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      const ids = emptyTrash();
      await Promise.all(ids.map((id) => driveDeleteFile(session.accessToken, id)));
      setSelected(new Set());
      toast.success("Trash emptied");
    } catch {
      toast.error("Failed to empty trash");
    } finally {
      setProcessing(false);
      setShowEmptyConfirm(false);
    }
  };

  const daysUntilDelete = (trashedAt: number) => {
    const days = Math.ceil(
      (trashedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
    );
    return Math.max(0, days);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/vault"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Trash</h1>
              <p className="text-sm text-muted-foreground">
                Items are automatically deleted after 7 days
              </p>
            </div>
          </div>
          {trash.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              onClick={() => setShowEmptyConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Empty trash
            </Button>
          )}
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {selected.size} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleRestore(Array.from(selected))}
              disabled={processing}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              onClick={() => {
                setDeleteTargetIds(Array.from(selected));
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete forever
            </Button>
          </div>
        )}

        {/* Trash list */}
        {trash.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Trash className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Trash is empty</p>
            <p className="text-sm">Deleted files will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {trash.map(({ file, trashedAt, originalFolder }) => {
              const Icon = getFileIcon(file.mimeType);
              const isSelected = selected.has(file.id);
              const days = daysUntilDelete(trashedAt);
              return (
                <div
                  key={file.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50",
                    isSelected && "border-violet-500 bg-violet-500/5"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(file.id)}
                    className="h-4 w-4 shrink-0 accent-violet-500"
                  />
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      From: {originalFolder === "/" ? "My Drive" : originalFolder}
                      {" · "}
                      {days > 0 ? `Deletes in ${days} day${days !== 1 ? "s" : ""}` : "Deleting soon"}
                    </p>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-60 hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRestore([file.id])}
                        className="gap-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteTargetIds([file.id]);
                          setShowDeleteConfirm(true);
                        }}
                        className="gap-2 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete forever
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty trash confirm */}
      <Dialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Empty trash?</DialogTitle>
            <DialogDescription>
              All {trash.length} item(s) will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmptyConfirm(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEmptyTrash} disabled={processing} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Empty trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {deleteTargetIds.length} file(s) will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handlePermanentDelete(deleteTargetIds)} disabled={processing} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
