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
  Folder,
  ChevronRight,
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
  const store = useVaultStore();
  const {
    files,
    currentFolder,
    viewMode,
    searchQuery,
    sortField,
    sortOrder,
    folders,
    setCurrentFolder,
    setViewMode,
    setSearchQuery,
    setSortField,
    setSortOrder,
    removeFile,
    removeFolder,
  } = store;

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
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Child folders of current directory
  const childFolders = useMemo(
    () => store.getChildFolders(currentFolder),
    [store, currentFolder, folders]
  );

  // Files directly in current folder (not in sub-folders)
  const currentFiles = useMemo(() => {
    let result = files.filter(
      (f) => (f.appProperties?.folder || "/") === currentFolder
    );

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

  // Filtered child folders (for search)
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return childFolders;
    const q = searchQuery.toLowerCase();
    return childFolders.filter((f) => {
      const name = f.split("/").pop() || "";
      return name.toLowerCase().includes(q);
    });
  }, [childFolders, searchQuery]);

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    if (currentFolder === "/") return [{ label: "My Drive", path: "/" }];
    const parts = currentFolder.split("/").filter(Boolean);
    const crumbs = [{ label: "My Drive", path: "/" }];
    let path = "";
    for (const part of parts) {
      path += `/${part}`;
      crumbs.push({ label: part, path });
    }
    return crumbs;
  }, [currentFolder]);

  const filesInFolder = (folderPath: string) =>
    files.filter((f) => {
      const ff = f.appProperties?.folder || "/";
      return ff === folderPath || ff.startsWith(folderPath + "/");
    }).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === currentFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentFiles.map((f) => f.id)));
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

  const handleDeleteFolder = (folderPath: string) => {
    const count = filesInFolder(folderPath);
    if (count > 0) {
      toast.error(
        `Cannot delete folder — it contains ${count} file(s). Remove them first.`
      );
      return;
    }
    removeFolder(folderPath);
    toast.success("Folder deleted");
    setFolderToDelete(null);
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

  const isEmpty = filteredFolders.length === 0 && currentFiles.length === 0;

  // All folders for the "move to" dialog (excluding the file's current folder)
  const allFolderPaths = useMemo(() => {
    return folders.filter((f) => f !== "/").concat(["/"]);
  }, [folders]);

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.path} className="flex items-center gap-1 shrink-0">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <button
              onClick={() => setCurrentFolder(crumb.path)}
              className={cn(
                "hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted",
                i === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search in this folder..."
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
            onClick={cycleSortField}
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

      {/* Empty state */}
      {isEmpty && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Folder className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">This folder is empty</p>
          <p className="text-sm">Upload files or create a folder to get started</p>
        </div>
      )}

      {isEmpty && searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Search className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}

      {/* Folders section */}
      {filteredFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Folders
          </h3>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredFolders.map((folderPath) => {
                const name = folderPath.split("/").pop() || "";
                const count = filesInFolder(folderPath);
                return (
                  <div
                    key={folderPath}
                    className="group relative flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setCurrentFolder(folderPath)}
                  >
                    <Folder className="h-8 w-8 text-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {count} item{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-0 group-hover:opacity-60 hover:!opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folderPath);
                          }}
                          className="gap-2 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFolders.map((folderPath) => {
                const name = folderPath.split("/").pop() || "";
                const count = filesInFolder(folderPath);
                return (
                  <div
                    key={folderPath}
                    className="group flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setCurrentFolder(folderPath)}
                  >
                    <Folder className="h-5 w-5 shrink-0 text-violet-400" />
                    <span className="flex-1 truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {count} item{count !== 1 ? "s" : ""}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer outline-none opacity-0 group-hover:opacity-60 hover:!opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folderPath);
                          }}
                          className="gap-2 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Files section */}
      {currentFiles.length > 0 && (
        <div className="space-y-2">
          {filteredFolders.length > 0 && (
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Files
            </h3>
          )}

          {/* Select all */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={selectAll}
            >
              {selected.size === currentFiles.length
                ? "Deselect all"
                : "Select all"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentFiles.length} file(s)
            </span>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentFiles.map((file) => {
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
                            setMoveTarget({
                              fileId: file.id,
                              fileName: file.name,
                            });
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
            <div className="space-y-1">
              {currentFiles.map((file) => {
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
                            setMoveTarget({
                              fileId: file.id,
                              fileName: file.name,
                            });
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
        </div>
      )}

      {/* Preview dialog */}
      <FilePreview
        file={previewFile}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      {/* Delete file confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTargets.length > 1 ? "files" : "file"}?
            </DialogTitle>
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

      {/* Delete folder confirmation */}
      <Dialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{folderToDelete?.split("/").pop()}&rdquo;? The folder
              must be empty.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                folderToDelete && handleDeleteFolder(folderToDelete)
              }
            >
              Delete
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
            <DialogTitle>
              Move &ldquo;{moveTarget?.fileName}&rdquo;
            </DialogTitle>
            <DialogDescription>Select a destination folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-auto">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() =>
                moveTarget && handleMoveFile(moveTarget.fileId, "/")
              }
            >
              <Folder className="h-4 w-4 text-violet-400" />
              My Drive (root)
            </Button>
            {allFolderPaths
              .filter((f) => f !== "/")
              .map((folder) => (
                <Button
                  key={folder}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() =>
                    moveTarget && handleMoveFile(moveTarget.fileId, folder)
                  }
                >
                  <Folder className="h-4 w-4 text-violet-400" />
                  {folder}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
