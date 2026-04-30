"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Loader2,
  HardDrive,
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { listFiles, downloadFile, deleteFile } from "@/lib/drive";
import { formatFileSize } from "@/lib/file-utils";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { files, quota, setFiles } = useVaultStore();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showDeleteVault, setShowDeleteVault] = useState(false);
  const [deletingVault, setDeletingVault] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const vaultSize = files.reduce((sum, f) => sum + parseInt(f.size || "0"), 0);
  const quotaPercent = quota ? Math.round((quota.usage / quota.limit) * 100) : 0;

  const handleExport = async () => {
    if (!session?.accessToken) return;
    setExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const allFiles = await listFiles(session.accessToken);

      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        const blob = await downloadFile(session.accessToken, file.id);
        const folder = file.appProperties?.folder || "/";
        const path =
          folder === "/"
            ? file.name
            : `${folder.replace(/^\//, "")}/${file.name}`;
        zip.file(path, blob);
        setExportProgress(Math.round(((i + 1) / allFiles.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `undrive-export-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success("Vault exported successfully");
    } catch {
      toast.error("Failed to export vault");
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const handleDeleteVault = async () => {
    if (!session?.accessToken) return;
    setDeletingVault(true);
    setDeleteProgress(0);

    try {
      const allFiles = await listFiles(session.accessToken);

      for (let i = 0; i < allFiles.length; i++) {
        await deleteFile(session.accessToken, allFiles[i].id);
        setDeleteProgress(Math.round(((i + 1) / allFiles.length) * 100));
      }

      setFiles([]);
      toast.success("All vault files deleted");
      setShowDeleteVault(false);
      router.push("/vault");
    } catch {
      toast.error("Failed to delete some files");
    } finally {
      setDeletingVault(false);
      setDeleteProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/vault"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" />
              Storage
            </CardTitle>
            <CardDescription>
              Your Google Drive storage usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quota && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Drive usage</span>
                  <span>
                    {formatFileSize(quota.usage)} / {formatFileSize(quota.limit)}
                  </span>
                </div>
                <Progress value={quotaPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Undrive is using {formatFileSize(vaultSize)} across {files.length} files
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={theme === value ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export Vault
            </CardTitle>
            <CardDescription>
              Download all your files as a ZIP archive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleExport}
              disabled={exporting || files.length === 0}
              className="gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting... {exportProgress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export all files ({files.length})
                </>
              )}
            </Button>
            {exporting && <Progress value={exportProgress} className="h-1.5" />}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete all files from your hidden vault. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteVault(true)}
              disabled={files.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete all vault files ({files.length})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete vault confirmation */}
      <Dialog open={showDeleteVault} onOpenChange={setShowDeleteVault}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entire vault?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {files.length} files from your
              Google Drive&apos;s hidden folder. This action cannot be undone. Consider
              exporting your files first.
            </DialogDescription>
          </DialogHeader>
          {deletingVault && (
            <div className="space-y-2">
              <Progress value={deleteProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                Deleting... {deleteProgress}%
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteVault(false)}
              disabled={deletingVault}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVault}
              disabled={deletingVault}
              className="gap-2"
            >
              {deletingVault && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
