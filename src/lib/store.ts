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
}

export const useVaultStore = create<VaultState>((set) => ({
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
    const folderSet = new Set<string>(["/"]);
    files.forEach((f) => {
      const folder = f.appProperties?.folder || "/";
      folderSet.add(folder);
    });
    set({ files, folders: Array.from(folderSet).sort() });
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
      const folderSet = new Set(s.folders);
      folderSet.add(file.appProperties?.folder || "/");
      return {
        files: [file, ...s.files],
        folders: Array.from(folderSet).sort(),
      };
    }),
}));
