"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Grid3X3,
  List,
  ArrowUpDown,
  Trash2,
  Download,
  MoreVertical,
  FolderInput,
  Loader2,
} from "lucide-react";
import { useVaultStore, type SortField } from "@/lib/store";
import type { DriveFile } from "@/lib/drive";
import {
  deleteFile,
  downloadFile,
  updateFileMetadata,
} from "@/lib/drive";
import {
  getFileIcon,
  formatFileSize,
  formatDate,
  isPreviewable,
} from "@/lib/file-utils";
import { FilePreview } from "./file-preview";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function FileBrowser() {
  const { data: session } = useSession();
  const {
    files,
    currentFolder,
    viewMode,
    searchQuery,
    sortField,
    sortOrder,
    folders,
    setViewMode,
    setSearchQuery,
    setSortField,
    setSortOrder,
    removeFile,
  } = useVaultStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{
    fileId: string;
    fileName: string;
  } | null>(null);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (currentFolder !== "/") {
      result = result.filter(
        (f) => (f.appProperties?.folder || "/") === currentFolder
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = parseInt(a.size || "0") - parseInt(b.size || "0");
          break;
        case "createdTime":
          cmp =
            new Date(a.createdTime).getTime() -
            new Date(b.createdTime).getTime();
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, currentFolder, searchQuery, sortField, sortOrder]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!session?.accessToken) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteFile(session.accessToken, id)));
      ids.forEach((id) => removeFile(id));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`Deleted ${ids.length} file(s)`);
    } catch {
      toast.error("Failed to delete some files");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteTargets([]);
    }
  };

  const handleDownloadFile = async (file: DriveFile) => {
    if (!session?.accessToken) return;
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

  const handleBulkDownload = async () => {
    const selectedFiles = files.filter((f) => selected.has(f.id));
    for (const file of selectedFiles) {
      await handleDownloadFile(file);
    }
  };

  const handleMoveFile = async (fileId: string, folder: string) => {
    if (!session?.accessToken) return;
    try {
      await updateFileMetadata(session.accessToken, fileId, {
        appProperties: { folder },
      });
      const updatedFiles = files.map((f) =>
        f.id === fileId
          ? { ...f, appProperties: { ...f.appProperties, folder } }
          : f
      );
      useVaultStore.getState().setFiles(updatedFiles);
      toast.success("File moved");
    } catch {
      toast.error("Failed to move file");
    }
    setMoveTarget(null);
  };

  const handleFileClick = (file: DriveFile) => {
    if (isPreviewable(file.mimeType)) {
      setPreviewFile(file);
      setShowPreview(true);
    } else {
      handleDownloadFile(file);
    }
  };

  const cycleSortField = () => {
    const fields: SortField[] = ["name", "createdTime", "size"];
    const idx = fields.indexOf(sortField);
    const next = fields[(idx + 1) % fields.length];
    setSortField(next);
  };

  const sortLabel: Record<SortField, string> = {
    name: "Name",
    createdTime: "Date",
    size: "Size",
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {selected.size} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleBulkDownload}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => {
                  setDeleteTargets(Array.from(selected));
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              cycleSortField();
            }}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortLabel[sortField]}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>

          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-l-md"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-r-md"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Select all */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAll}>
            {selected.size === filteredFiles.length ? "Deselect all" : "Select all"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {filteredFiles.length} file(s)
          </span>
        </div>
      )}

      {/* File list */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <p className="text-lg font-medium">No files here</p>
          <p className="text-sm">Upload files to get started</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-2">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const isSelected = selected.has(file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer transition-colors hover:bg-muted/50",
                  isSelected && "border-violet-500 bg-violet-500/5"
                )}
                onClick={() => handleFileClick(file)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(file.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 h-4 w-4 rounded border-muted-foreground/50 accent-violet-500"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="absolute top-1 right-1 h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-60 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                      className="gap-2"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTarget({ fileId: file.id, fileName: file.name });
                      }}
                      className="gap-2"
                    >
                      <FolderInput className="h-3.5 w-3.5" /> Move to folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargets([file.id]);
                        setShowDeleteConfirm(true);
                      }}
                      className="gap-2 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Icon className="h-10 w-10 text-muted-foreground" />
                <p className="text-xs text-center truncate w-full font-medium">
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1 mt-2">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const isSelected = selected.has(file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                  isSelected && "border-violet-500 bg-violet-500/5"
                )}
                onClick={() => handleFileClick(file)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(file.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 shrink-0 accent-violet-500"
                />
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">
                  {file.name}
                </span>
                <span className="hidden sm:block text-xs text-muted-foreground w-20 text-right">
                  {formatFileSize(file.size)}
                </span>
                <span className="hidden md:block text-xs text-muted-foreground w-28 text-right">
                  {formatDate(file.createdTime)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-60 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                      className="gap-2"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTarget({ fileId: file.id, fileName: file.name });
                      }}
                      className="gap-2"
                    >
                      <FolderInput className="h-3.5 w-3.5" /> Move to folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargets([file.id]);
                        setShowDeleteConfirm(true);
                      }}
                      className="gap-2 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <FilePreview
        file={previewFile}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTargets.length > 1 ? "files" : "file"}?</DialogTitle>
            <DialogDescription>
              This action is permanent. Files in the hidden app folder cannot be
              recovered from trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => handleDelete(deleteTargets)}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to folder dialog */}
      <Dialog
        open={!!moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move &ldquo;{moveTarget?.fileName}&rdquo;</DialogTitle>
            <DialogDescription>Select a destination folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {folders.map((folder) => (
              <Button
                key={folder}
                variant="ghost"
                className="w-full justify-start"
                onClick={() =>
                  moveTarget && handleMoveFile(moveTarget.fileId, folder)
                }
              >
                {folder === "/" ? "All Files (root)" : folder}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
