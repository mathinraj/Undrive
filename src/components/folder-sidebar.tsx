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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderPlus,
  Plus,
  Upload,
  HardDrive,
  ChevronRight,
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
  className?: string;
  onUploadClick?: () => void;
}

export function FolderSidebar({
  className,
  onUploadClick,
}: FolderSidebarProps) {
  const { folders, currentFolder, setCurrentFolder, addFolder } =
    useVaultStore();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;

    const path =
      currentFolder === "/" ? `/${name}` : `${currentFolder}/${name}`;

    addFolder(path);
    setShowNewFolder(false);
    setNewFolderName("");
  };

  const toggleExpand = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getChildFolders = (parentPath: string): string[] => {
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
  };

  const renderFolder = (path: string, depth: number) => {
    const name = path === "/" ? "My Drive" : path.split("/").pop() || "";
    const children = getChildFolders(path);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(path);
    const isActive = currentFolder === path;

    return (
      <div key={path}>
        <div
          className="flex items-center group"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {/* Expand toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(path);
            }}
            className={cn(
              "h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-muted transition-colors",
              !hasChildren && "invisible"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>

          <Button
            variant={isActive ? "secondary" : "ghost"}
            className="flex-1 justify-start gap-2 h-8 px-2 text-sm"
            onClick={() => setCurrentFolder(path)}
          >
            {path === "/" ? (
              <HardDrive className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-violet-400" />
            )}
            <span className="truncate">{name}</span>
          </Button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-1 p-3", className)}>
      {/* New button */}
      <DropdownMenu>
        <DropdownMenuTrigger className="mb-3 flex h-10 w-full items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white shadow-md hover:bg-violet-700 transition-colors cursor-pointer outline-none">
          <Plus className="h-5 w-5" />
          New
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => onUploadClick?.()}
            className="gap-2 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload file
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowNewFolder(true)}
            className="gap-2 cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            New folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Folder tree */}
      {renderFolder("/", 0)}

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creating in:{" "}
            <span className="font-medium text-foreground">
              {currentFolder === "/" ? "My Drive" : currentFolder}
            </span>
          </p>
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
