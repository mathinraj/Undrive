"use client";

import { create } from "zustand";
import type { DriveFile, StorageQuota } from "./drive";

export type ViewMode = "grid" | "list";
export type SortField = "name" | "createdTime" | "size";
export type SortOrder = "asc" | "desc";

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

  setFiles: (files: DriveFile[]) => void;
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
  getChildFolders: (parentPath: string) => string[];
  getFilesInFolder: (folderPath: string) => DriveFile[];
}

function collectFolders(files: DriveFile[], existing: string[]): string[] {
  const folderSet = new Set<string>(["/", ...existing]);
  files.forEach((f) => {
    const folder = f.appProperties?.folder || "/";
    folderSet.add(folder);
    // Also add parent folders in the path
    const parts = folder.split("/").filter(Boolean);
    let path = "";
    for (const part of parts) {
      path += `/${part}`;
      folderSet.add(path);
    }
  });
  return Array.from(folderSet).sort();
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

  setFiles: (files) => {
    const folders = collectFolders(files, get().folders);
    set({ files, folders });
  },

  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setQuota: (quota) => set({ quota }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addUpload: (item) =>
    set((s) => ({ uploads: [...s.uploads, item] })),

  updateUpload: (id, partial) =>
    set((s) => ({
      uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...partial } : u)),
    })),

  removeUpload: (id) =>
    set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),

  clearCompletedUploads: () =>
    set((s) => ({
      uploads: s.uploads.filter((u) => u.status !== "done"),
    })),

  removeFile: (fileId) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== fileId) })),

  addFile: (file) =>
    set((s) => {
      const newFiles = [file, ...s.files];
      return {
        files: newFiles,
        folders: collectFolders(newFiles, s.folders),
      };
    }),

  addFolder: (path: string) =>
    set((s) => {
      if (s.folders.includes(path)) return s;
      const updated = [...s.folders, path];
      // Also ensure parent folders exist
      const parts = path.split("/").filter(Boolean);
      let parent = "";
      for (const part of parts) {
        parent += `/${part}`;
        if (!updated.includes(parent)) updated.push(parent);
      }
      return { folders: updated.sort() };
    }),

  removeFolder: (path: string) =>
    set((s) => {
      if (path === "/") return s;
      // Remove this folder and all sub-folders
      const updated = s.folders.filter(
        (f) => f !== path && !f.startsWith(path + "/")
      );
      return {
        folders: updated,
        currentFolder: s.currentFolder === path || s.currentFolder.startsWith(path + "/")
          ? "/"
          : s.currentFolder,
      };
    }),

  getChildFolders: (parentPath: string) => {
    const { folders } = get();
    return folders.filter((f) => {
      if (f === parentPath || f === "/") return false;
      if (parentPath === "/") {
        // Direct children of root: folders like "/Documents" (no further slashes)
        const withoutLeading = f.slice(1);
        return !withoutLeading.includes("/");
      }
      // Direct children: starts with parent + "/" and has no more slashes after
      if (!f.startsWith(parentPath + "/")) return false;
      const remainder = f.slice(parentPath.length + 1);
      return !remainder.includes("/");
    });
  },

  getFilesInFolder: (folderPath: string) => {
    const { files } = get();
    return files.filter((f) => (f.appProperties?.folder || "/") === folderPath);
  },
}));
