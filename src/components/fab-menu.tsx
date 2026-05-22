"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Upload, FolderPlus, X } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface FabMenuProps {
  onUploadClick: () => void;
}

export function FabMenu({ onUploadClick }: FabMenuProps) {
  const [open, setOpen] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { currentFolder, addFolder } = useVaultStore();

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;

    const path =
      currentFolder === "/" ? `/${name}` : `${currentFolder}/${name}`;

    addFolder(path);
    setShowNewFolder(false);
    setNewFolderName("");
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB container — mobile only */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 lg:hidden">
        {/* Action buttons */}
        {open && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => {
                onUploadClick();
                setOpen(false);
              }}
              className="flex items-center gap-3 rounded-full bg-card border shadow-lg pl-4 pr-3 py-2.5 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium">Upload file</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <Upload className="h-4 w-4 text-blue-500" />
              </div>
            </button>
            <button
              onClick={() => {
                setShowNewFolder(true);
                setOpen(false);
              }}
              className="flex items-center gap-3 rounded-full bg-card border shadow-lg pl-4 pr-3 py-2.5 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium">New folder</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <FolderPlus className="h-4 w-4 text-blue-500" />
              </div>
            </button>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95",
            open && "rotate-45"
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
