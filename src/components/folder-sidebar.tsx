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
import { Folder, FolderPlus, Trash2 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FolderSidebar({ className }: { className?: string }) {
  const { folders, currentFolder, setCurrentFolder, files, setFiles } =
    useVaultStore();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;

    const path = currentFolder === "/" ? `/${name}` : `${currentFolder}/${name}`;

    if (!folders.includes(path)) {
      useVaultStore.setState({ folders: [...folders, path].sort() });
    }

    setShowNewFolder(false);
    setNewFolderName("");
  };

  const handleDeleteFolder = (folder: string) => {
    if (folder === "/") return;
    const filesInFolder = files.filter(
      (f) => f.appProperties?.folder === folder
    );
    if (filesInFolder.length > 0) {
      return;
    }
    useVaultStore.setState({
      folders: folders.filter((f) => f !== folder),
    });
    if (currentFolder === folder) setCurrentFolder("/");
  };

  const fileCountInFolder = (folder: string) =>
    files.filter((f) => (f.appProperties?.folder || "/") === folder).length;

  return (
    <div className={cn("flex flex-col gap-1 p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowNewFolder(true)}
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {folders.map((folder) => (
        <div key={folder} className="group flex items-center">
          <Button
            variant={currentFolder === folder ? "secondary" : "ghost"}
            className="flex-1 justify-start gap-2 h-8 px-2 text-sm"
            onClick={() => setCurrentFolder(folder)}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {folder === "/" ? "All Files" : folder.split("/").pop()}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {fileCountInFolder(folder)}
            </span>
          </Button>
          {folder !== "/" && fileCountInFolder(folder) === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => handleDeleteFolder(folder)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      ))}

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
    </div>
  );
}
