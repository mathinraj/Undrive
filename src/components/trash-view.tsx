"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
  Trash2,
  RotateCcw,
  MoreVertical,
  Loader2,
  Trash,
  Folder,
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import {
  deleteFile as driveDeleteFile,
  updateFileMetadata,
} from "@/lib/drive";
import { getFileIcon, formatFileSize } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TrashView() {
  const { data: session } = useSession();
  const {
    trash,
    trashedFolders,
    restoreFromTrash,
    restoreFolder,
    permanentlyDelete,
    permanentlyDeleteFolder,
    emptyTrash,
  } = useVaultStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get standalone trashed files (not part of any trashed folder)
  const trashedFolderFileIds = new Set(
    trashedFolders.flatMap((tf) => tf.fileIds)
  );
  const standaloneTrash = trash.filter(
    (t) => !trashedFolderFileIds.has(t.file.id)
  );

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
      setSelected(new Set());
      toast.success(`Restored ${ids.length} file(s)`);
    } catch {
      toast.error("Failed to restore");
    } finally {
      setProcessing(false);
    }
  };

  const handleRestoreFolder = async (folderPath: string) => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      const tf = trashedFolders.find((f) => f.path === folderPath);
      if (tf) {
        await Promise.all(
          tf.fileIds.map((id) => {
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
      }
      restoreFolder(folderPath);
      toast.success(`Restored folder "${folderPath.split("/").pop()}"`);
    } catch {
      toast.error("Failed to restore folder");
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (ids: string[]) => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      await Promise.all(
        ids.map((id) => driveDeleteFile(session.accessToken, id))
      );
      permanentlyDelete(ids);
      setSelected(new Set());
      toast.success(`Permanently deleted ${ids.length} file(s)`);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setProcessing(false);
      setShowDeleteConfirm(false);
      setDeleteTargetIds([]);
    }
  };

  const handlePermanentDeleteFolder = async (folderPath: string) => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      const tf = trashedFolders.find((f) => f.path === folderPath);
      if (tf) {
        await Promise.all(
          tf.fileIds.map((id) => driveDeleteFile(session.accessToken, id))
        );
      }
      permanentlyDeleteFolder(folderPath);
      toast.success("Folder permanently deleted");
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setProcessing(false);
      setDeleteFolderTarget(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!session?.accessToken) return;
    setProcessing(true);
    try {
      const { fileIds } = emptyTrash();
      await Promise.all(
        fileIds.map((id) => driveDeleteFile(session.accessToken, id))
      );
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
      (trashedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) /
        (24 * 60 * 60 * 1000)
    );
    return Math.max(0, days);
  };

  const totalItems = standaloneTrash.length + trashedFolders.length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trash</h2>
          <p className="text-xs text-muted-foreground">
            Items are automatically deleted after 7 days
          </p>
        </div>
        {totalItems > 0 && (
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

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Trash className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Trash is empty</p>
          <p className="text-sm">Deleted items will appear here</p>
        </div>
      )}

      {/* Trashed folders */}
      {trashedFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Folders
          </h3>
          <div className="space-y-1">
            {trashedFolders.map((tf) => {
              const name = tf.path.split("/").pop() || "";
              const days = daysUntilDelete(tf.trashedAt);
              return (
                <div
                  key={tf.path}
                  className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Folder className="h-5 w-5 shrink-0 text-violet-400 opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tf.fileIds.length} file(s) ·{" "}
                      {days > 0
                        ? `Deletes in ${days} day${days !== 1 ? "s" : ""}`
                        : "Deleting soon"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-60 hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRestoreFolder(tf.path)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore folder
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteFolderTarget(tf.path)}
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
        </div>
      )}

      {/* Standalone trashed files */}
      {standaloneTrash.length > 0 && (
        <div className="space-y-2">
          {trashedFolders.length > 0 && (
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Files
            </h3>
          )}
          <div className="space-y-1">
            {standaloneTrash.map(({ file, trashedAt, originalFolder }) => {
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
                      From:{" "}
                      {originalFolder === "/" ? "My Drive" : originalFolder} ·{" "}
                      {days > 0
                        ? `Deletes in ${days} day${days !== 1 ? "s" : ""}`
                        : "Deleting soon"}
                    </p>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-60 hover:opacity-100">
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
        </div>
      )}

      {/* Empty trash confirm */}
      <Dialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Empty trash?</DialogTitle>
            <DialogDescription>
              All items will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmptyConfirm(false)} disabled={processing}>Cancel</Button>
            <Button variant="destructive" onClick={handleEmptyTrash} disabled={processing} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Empty trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete files confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {deleteTargetIds.length} file(s) will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={processing}>Cancel</Button>
            <Button variant="destructive" onClick={() => handlePermanentDelete(deleteTargetIds)} disabled={processing} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete folder confirm */}
      <Dialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder forever?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteFolderTarget?.split("/").pop()}&rdquo; and all its files will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderTarget(null)} disabled={processing}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteFolderTarget && handlePermanentDeleteFolder(deleteFolderTarget)} disabled={processing} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
