"use client";

import { create } from "zustand";
import type { DriveFile, StorageQuota } from "./drive";

export type ViewMode = "grid" | "list";
export type SortField = "name" | "createdTime" | "size";
export type SortOrder = "asc" | "desc";
export type VaultView = "drive" | "trash";

export interface TrashedItem {
  file: DriveFile;
  trashedAt: number;
  originalFolder: string;
}

export interface TrashedFolder {
  path: string;
  trashedAt: number;
  fileIds: string[];
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  driveFile?: DriveFile;
}

interface VaultState {
  files: DriveFile[];
  folders: string[];
  currentFolder: string;
  viewMode: ViewMode;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  quota: StorageQuota | null;
  isLoading: boolean;
  uploads: UploadItem[];
  trash: TrashedItem[];
  trashedFolders: TrashedFolder[];
  activeView: VaultView;
  selectedFile: DriveFile | null;

  setFiles: (files: DriveFile[], savedFolders?: string[]) => void;
  setCurrentFolder: (folder: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setQuota: (quota: StorageQuota) => void;
  setIsLoading: (loading: boolean) => void;
  addUpload: (item: UploadItem) => void;
  updateUpload: (id: string, partial: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompletedUploads: () => void;
  removeFile: (fileId: string) => void;
  addFile: (file: DriveFile) => void;
  addFolder: (path: string) => void;
  removeFolder: (path: string) => void;
  setFolders: (folders: string[]) => void;
  getChildFolders: (parentPath: string) => string[];
  getFilesInFolder: (folderPath: string) => DriveFile[];
  setActiveView: (view: VaultView) => void;
  setSelectedFile: (file: DriveFile | null) => void;

  moveToTrash: (fileIds: string[]) => void;
  trashFolder: (folderPath: string) => void;
  restoreFromTrash: (fileIds: string[]) => void;
  restoreFolder: (folderPath: string) => void;
  permanentlyDelete: (fileIds: string[]) => void;
  permanentlyDeleteFolder: (folderPath: string) => void;
  emptyTrash: () => { fileIds: string[] };
  cleanExpiredTrash: () => string[];

  moveFolderTo: (folderPath: string, newParent: string) => void;
  copyFolderTo: (folderPath: string, newParent: string) => void;
}

function collectFolders(files: DriveFile[], existing: string[]): string[] {
  const folderSet = new Set<string>(["/", ...existing]);
  files.forEach((f) => {
    if (f.appProperties?.trashed === "true") return;
    const folder = f.appProperties?.folder || "/";
    folderSet.add(folder);
    const parts = folder.split("/").filter(Boolean);
    let path = "";
    for (const part of parts) {
      path += `/${part}`;
      folderSet.add(path);
    }
  });
  return Array.from(folderSet).sort();
}

function getChildFoldersFn(folders: string[], parentPath: string): string[] {
  return folders.filter((f) => {
    if (f === parentPath || f === "/") return false;
    if (parentPath === "/") {
      const withoutLeading = f.slice(1);
      return !withoutLeading.includes("/");
    }
    if (!f.startsWith(parentPath + "/")) return false;
    const remainder = f.slice(parentPath.length + 1);
    return !remainder.includes("/");
  });
}

export const useVaultStore = create<VaultState>((set, get) => ({
  files: [],
  folders: ["/"],
  currentFolder: "/",
  viewMode: "grid",
  searchQuery: "",
  sortField: "createdTime",
  sortOrder: "desc",
  quota: null,
  isLoading: false,
  uploads: [],
  trash: [],
  trashedFolders: [],
  activeView: "drive",
  selectedFile: null,

  setFiles: (files, savedFolders?) => {
    const activeFiles = files.filter(
      (f) => f.appProperties?.trashed !== "true"
    );
    const trashedFiles = files.filter(
      (f) => f.appProperties?.trashed === "true"
    );
    const trashItems: TrashedItem[] = trashedFiles.map((f) => ({
      file: f,
      trashedAt: parseInt(f.appProperties?.trashedAt || "0"),
      originalFolder: f.appProperties?.originalFolder || "/",
    }));
    const existingFolders = savedFolders || get().folders;
    const folders = collectFolders(activeFiles, existingFolders);
    set({ files: activeFiles, trash: trashItems, folders });
  },

  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setQuota: (quota) => set({ quota }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setActiveView: (view) => set({ activeView: view, searchQuery: "" }),
  setSelectedFile: (file) => set({ selectedFile: file }),

  addUpload: (item) => set((s) => ({ uploads: [...s.uploads, item] })),
  updateUpload: (id, partial) =>
    set((s) => ({
      uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...partial } : u)),
    })),
  removeUpload: (id) =>
    set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
  clearCompletedUploads: () =>
    set((s) => ({ uploads: s.uploads.filter((u) => u.status !== "done") })),

  removeFile: (fileId) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== fileId) })),

  addFile: (file) =>
    set((s) => {
      const newFiles = [file, ...s.files];
      return { files: newFiles, folders: collectFolders(newFiles, s.folders) };
    }),

  addFolder: (path: string) =>
    set((s) => {
      if (s.folders.includes(path)) return s;
      const updated = [...s.folders, path];
      const parts = path.split("/").filter(Boolean);
      let parent = "";
      for (const part of parts) {
        parent += `/${part}`;
        if (!updated.includes(parent)) updated.push(parent);
      }
      return { folders: updated.sort() };
    }),

  setFolders: (folders: string[]) => {
    const folderSet = new Set(["/", ...folders]);
    set({ folders: Array.from(folderSet).sort() });
  },

  removeFolder: (path: string) =>
    set((s) => {
      if (path === "/") return s;
      const updated = s.folders.filter(
        (f) => f !== path && !f.startsWith(path + "/")
      );
      return {
        folders: updated,
        currentFolder:
          s.currentFolder === path || s.currentFolder.startsWith(path + "/")
            ? "/"
            : s.currentFolder,
      };
    }),

  getChildFolders: (parentPath: string) =>
    getChildFoldersFn(get().folders, parentPath),

  getFilesInFolder: (folderPath: string) =>
    get().files.filter((f) => (f.appProperties?.folder || "/") === folderPath),

  // --- Trash ---

  moveToTrash: (fileIds: string[]) =>
    set((s) => {
      const now = Date.now();
      const toTrash: TrashedItem[] = [];
      const remaining = s.files.filter((f) => {
        if (fileIds.includes(f.id)) {
          toTrash.push({
            file: f,
            trashedAt: now,
            originalFolder: f.appProperties?.folder || "/",
          });
          return false;
        }
        return true;
      });
      return { files: remaining, trash: [...s.trash, ...toTrash] };
    }),

  trashFolder: (folderPath: string) =>
    set((s) => {
      const now = Date.now();
      const folderFiles = s.files.filter((f) => {
        const ff = f.appProperties?.folder || "/";
        return ff === folderPath || ff.startsWith(folderPath + "/");
      });
      const fileIds = folderFiles.map((f) => f.id);

      const toTrash: TrashedItem[] = folderFiles.map((f) => ({
        file: f,
        trashedAt: now,
        originalFolder: f.appProperties?.folder || "/",
      }));

      const trashedFolder: TrashedFolder = {
        path: folderPath,
        trashedAt: now,
        fileIds,
      };

      const remainingFiles = s.files.filter((f) => !fileIds.includes(f.id));
      const remainingFolders = s.folders.filter(
        (f) => f !== folderPath && !f.startsWith(folderPath + "/")
      );

      return {
        files: remainingFiles,
        folders: remainingFolders,
        trash: [...s.trash, ...toTrash],
        trashedFolders: [...s.trashedFolders, trashedFolder],
        currentFolder:
          s.currentFolder === folderPath ||
          s.currentFolder.startsWith(folderPath + "/")
            ? "/"
            : s.currentFolder,
      };
    }),

  restoreFromTrash: (fileIds: string[]) =>
    set((s) => {
      const toRestore: DriveFile[] = [];
      const remainingTrash = s.trash.filter((t) => {
        if (fileIds.includes(t.file.id)) {
          toRestore.push(t.file);
          return false;
        }
        return true;
      });
      const newFiles = [...toRestore, ...s.files];
      return {
        files: newFiles,
        trash: remainingTrash,
        folders: collectFolders(newFiles, s.folders),
      };
    }),

  restoreFolder: (folderPath: string) =>
    set((s) => {
      const tf = s.trashedFolders.find((f) => f.path === folderPath);
      if (!tf) return s;

      const toRestore: DriveFile[] = [];
      const remainingTrash = s.trash.filter((t) => {
        if (tf.fileIds.includes(t.file.id)) {
          toRestore.push(t.file);
          return false;
        }
        return true;
      });

      const newFiles = [...toRestore, ...s.files];
      const restoredFolders = new Set([...s.folders, folderPath]);
      // Also restore sub-folders from original file paths
      toRestore.forEach((f) => {
        const folder = f.appProperties?.folder || "/";
        restoredFolders.add(folder);
        const parts = folder.split("/").filter(Boolean);
        let p = "";
        for (const part of parts) {
          p += `/${part}`;
          restoredFolders.add(p);
        }
      });

      return {
        files: newFiles,
        trash: remainingTrash,
        trashedFolders: s.trashedFolders.filter((f) => f.path !== folderPath),
        folders: Array.from(restoredFolders).sort(),
      };
    }),

  permanentlyDelete: (fileIds: string[]) =>
    set((s) => ({
      trash: s.trash.filter((t) => !fileIds.includes(t.file.id)),
    })),

  permanentlyDeleteFolder: (folderPath: string) =>
    set((s) => {
      const tf = s.trashedFolders.find((f) => f.path === folderPath);
      if (!tf) return s;
      return {
        trash: s.trash.filter((t) => !tf.fileIds.includes(t.file.id)),
        trashedFolders: s.trashedFolders.filter((f) => f.path !== folderPath),
      };
    }),

  emptyTrash: () => {
    const { trash, trashedFolders } = get();
    const fileIds = trash.map((t) => t.file.id);
    set({ trash: [], trashedFolders: [] });
    return { fileIds };
  },

  cleanExpiredTrash: () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const state = get();
    const expired = state.trash.filter((t) => t.trashedAt < sevenDaysAgo);
    const expiredIds = expired.map((t) => t.file.id);
    const expiredFolders = state.trashedFolders.filter(
      (f) => f.trashedAt < sevenDaysAgo
    );
    if (expiredIds.length > 0 || expiredFolders.length > 0) {
      set((s) => ({
        trash: s.trash.filter((t) => t.trashedAt >= sevenDaysAgo),
        trashedFolders: s.trashedFolders.filter(
          (f) => f.trashedAt >= sevenDaysAgo
        ),
      }));
    }
    return expiredIds;
  },

  // --- Folder move/copy ---

  moveFolderTo: (folderPath: string, newParent: string) =>
    set((s) => {
      const folderName = folderPath.split("/").pop() || "";
      const newPath =
        newParent === "/" ? `/${folderName}` : `${newParent}/${folderName}`;
      if (folderPath === newPath) return s;
      if (newPath.startsWith(folderPath + "/")) return s;

      const updatedFolders = s.folders.map((f) => {
        if (f === folderPath) return newPath;
        if (f.startsWith(folderPath + "/"))
          return newPath + f.slice(folderPath.length);
        return f;
      });
      const updatedFiles = s.files.map((f) => {
        const ff = f.appProperties?.folder || "/";
        if (ff === folderPath || ff.startsWith(folderPath + "/")) {
          const newFolder =
            ff === folderPath ? newPath : newPath + ff.slice(folderPath.length);
          return { ...f, appProperties: { ...f.appProperties, folder: newFolder } };
        }
        return f;
      });
      return {
        folders: [...new Set(["/", ...updatedFolders])].sort(),
        files: updatedFiles,
        currentFolder:
          s.currentFolder === folderPath
            ? newPath
            : s.currentFolder.startsWith(folderPath + "/")
              ? newPath + s.currentFolder.slice(folderPath.length)
              : s.currentFolder,
      };
    }),

  copyFolderTo: (folderPath: string, newParent: string) =>
    set((s) => {
      const folderName = folderPath.split("/").pop() || "";
      const newPath =
        newParent === "/" ? `/${folderName}` : `${newParent}/${folderName}`;
      if (newPath.startsWith(folderPath + "/")) return s;

      const newFolders: string[] = [];
      s.folders.forEach((f) => {
        if (f === folderPath) newFolders.push(newPath);
        else if (f.startsWith(folderPath + "/"))
          newFolders.push(newPath + f.slice(folderPath.length));
      });
      return { folders: [...new Set([...s.folders, ...newFolders])].sort() };
    }),
}));
