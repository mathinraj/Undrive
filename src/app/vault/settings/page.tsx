"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Lock,
  Timer,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { usePasscodeStore } from "@/lib/passcode";
import { listFiles, downloadFile, deleteFile } from "@/lib/drive";
import { formatFileSize } from "@/lib/file-utils";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { files, quota, setFiles } = useVaultStore();
  const passcodeStore = usePasscodeStore();

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showDeleteVault, setShowDeleteVault] = useState(false);
  const [deletingVault, setDeletingVault] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  // Passcode dialogs
  const [showSetPin, setShowSetPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showRemovePin, setShowRemovePin] = useState(false);
  const [pinStep, setPinStep] = useState<"current" | "new" | "confirm">("new");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [removePinInput, setRemovePinInput] = useState("");

  const vaultSize = files.reduce(
    (sum, f) => sum + parseInt(f.size || "0"),
    0
  );
  const quotaPercent = quota
    ? Math.round((quota.usage / quota.limit) * 100)
    : 0;

  const resetPinDialogs = () => {
    setCurrentPinInput("");
    setNewPinInput("");
    setConfirmPinInput("");
    setRemovePinInput("");
    setPinError("");
    setPinStep("new");
  };

  const handleSetPin = () => {
    setPinError("");

    if (newPinInput.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    if (!/^\d+$/.test(newPinInput)) {
      setPinError("PIN must contain only numbers");
      return;
    }
    if (pinStep === "new") {
      setPinStep("confirm");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError("PINs don't match");
      setConfirmPinInput("");
      return;
    }

    passcodeStore.setPasscode(newPinInput);
    toast.success("Passcode enabled");
    setShowSetPin(false);
    resetPinDialogs();
  };

  const handleChangePin = () => {
    setPinError("");

    if (pinStep === "current") {
      if (!passcodeStore.verifyPin(currentPinInput)) {
        setPinError("Current PIN is incorrect");
        setCurrentPinInput("");
        return;
      }
      setPinStep("new");
      return;
    }

    if (pinStep === "new") {
      if (newPinInput.length < 4) {
        setPinError("PIN must be at least 4 digits");
        return;
      }
      if (!/^\d+$/.test(newPinInput)) {
        setPinError("PIN must contain only numbers");
        return;
      }
      setPinStep("confirm");
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinError("PINs don't match");
      setConfirmPinInput("");
      return;
    }

    passcodeStore.setPasscode(newPinInput);
    toast.success("Passcode changed");
    setShowChangePin(false);
    resetPinDialogs();
  };

  const handleRemovePin = () => {
    if (!passcodeStore.verifyPin(removePinInput)) {
      setPinError("Incorrect PIN");
      setRemovePinInput("");
      return;
    }
    passcodeStore.removePasscode();
    toast.success("Passcode removed");
    setShowRemovePin(false);
    resetPinDialogs();
  };

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
      saveAs(
        content,
        `undrive-export-${new Date().toISOString().slice(0, 10)}.zip`
      );
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

  const passcodeEnabled = passcodeStore.config?.enabled ?? false;

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

        {/* Passcode / Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Passcode Lock
            </CardTitle>
            <CardDescription>
              {passcodeEnabled
                ? "Your vault is protected with a PIN"
                : "Add a PIN to protect access to your vault"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passcodeEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-green-500/5 border-green-500/20">
                  <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Passcode is on</p>
                    <p className="text-xs text-muted-foreground">
                      Auto-locks after{" "}
                      {passcodeStore.config?.autoLockMinutes} min of inactivity
                    </p>
                  </div>
                </div>

                {/* Auto-lock timer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Timer className="h-3.5 w-3.5" />
                    Auto-lock timer
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AUTO_LOCK_OPTIONS.map(({ value, label }) => (
                      <Button
                        key={value}
                        variant={
                          passcodeStore.config?.autoLockMinutes === value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => passcodeStore.updateAutoLock(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      resetPinDialogs();
                      setPinStep("current");
                      setShowChangePin(true);
                    }}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Change PIN
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive"
                    onClick={() => {
                      resetPinDialogs();
                      setShowRemovePin(true);
                    }}
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    Remove passcode
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="gap-2"
                onClick={() => {
                  resetPinDialogs();
                  setShowSetPin(true);
                }}
              >
                <Lock className="h-4 w-4" />
                Enable passcode
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" />
              Storage
            </CardTitle>
            <CardDescription>Your Google Drive storage usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quota && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Drive usage</span>
                  <span>
                    {formatFileSize(quota.usage)} /{" "}
                    {formatFileSize(quota.limit)}
                  </span>
                </div>
                <Progress value={quotaPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Undrive is using {formatFileSize(vaultSize)} across{" "}
                  {files.length} files
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
              Permanently delete all files from your hidden vault. This cannot be
              undone.
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

      {/* Set PIN dialog */}
      <Dialog
        open={showSetPin}
        onOpenChange={(open) => {
          setShowSetPin(open);
          if (!open) resetPinDialogs();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pinStep === "confirm" ? "Confirm your PIN" : "Set a PIN"}
            </DialogTitle>
            <DialogDescription>
              {pinStep === "confirm"
                ? "Enter your PIN again to confirm"
                : "Choose a 4-6 digit PIN to lock your vault"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={
                pinStep === "confirm" ? "Confirm PIN" : "Enter PIN (4-6 digits)"
              }
              value={pinStep === "confirm" ? confirmPinInput : newPinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (pinStep === "confirm") setConfirmPinInput(val);
                else setNewPinInput(val);
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
              autoFocus
              autoComplete="off"
            />
            {pinError && (
              <p className="text-sm text-destructive">{pinError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (pinStep === "confirm") {
                  setPinStep("new");
                  setConfirmPinInput("");
                  setPinError("");
                } else {
                  setShowSetPin(false);
                  resetPinDialogs();
                }
              }}
            >
              {pinStep === "confirm" ? "Back" : "Cancel"}
            </Button>
            <Button onClick={handleSetPin}>
              {pinStep === "confirm" ? "Enable" : "Next"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN dialog */}
      <Dialog
        open={showChangePin}
        onOpenChange={(open) => {
          setShowChangePin(open);
          if (!open) resetPinDialogs();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pinStep === "current"
                ? "Verify current PIN"
                : pinStep === "new"
                  ? "Set new PIN"
                  : "Confirm new PIN"}
            </DialogTitle>
            <DialogDescription>
              {pinStep === "current"
                ? "Enter your current PIN to continue"
                : pinStep === "new"
                  ? "Choose a new 4-6 digit PIN"
                  : "Enter your new PIN again"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={
                pinStep === "current"
                  ? "Current PIN"
                  : pinStep === "new"
                    ? "New PIN (4-6 digits)"
                    : "Confirm new PIN"
              }
              value={
                pinStep === "current"
                  ? currentPinInput
                  : pinStep === "new"
                    ? newPinInput
                    : confirmPinInput
              }
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (pinStep === "current") setCurrentPinInput(val);
                else if (pinStep === "new") setNewPinInput(val);
                else setConfirmPinInput(val);
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleChangePin()}
              autoFocus
              autoComplete="off"
            />
            {pinError && (
              <p className="text-sm text-destructive">{pinError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (pinStep === "confirm") {
                  setPinStep("new");
                  setConfirmPinInput("");
                  setPinError("");
                } else if (pinStep === "new") {
                  setPinStep("current");
                  setNewPinInput("");
                  setPinError("");
                } else {
                  setShowChangePin(false);
                  resetPinDialogs();
                }
              }}
            >
              {pinStep === "current" ? "Cancel" : "Back"}
            </Button>
            <Button onClick={handleChangePin}>
              {pinStep === "confirm" ? "Change PIN" : "Next"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove PIN dialog */}
      <Dialog
        open={showRemovePin}
        onOpenChange={(open) => {
          setShowRemovePin(open);
          if (!open) resetPinDialogs();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove passcode</DialogTitle>
            <DialogDescription>
              Enter your current PIN to remove passcode protection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Current PIN"
              value={removePinInput}
              onChange={(e) => {
                setRemovePinInput(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleRemovePin()}
              autoFocus
              autoComplete="off"
            />
            {pinError && (
              <p className="text-sm text-destructive">{pinError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemovePin(false);
                resetPinDialogs();
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemovePin}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete vault confirmation */}
      <Dialog open={showDeleteVault} onOpenChange={setShowDeleteVault}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entire vault?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {files.length} files from your
              Google Drive&apos;s hidden folder. This action cannot be undone.
              Consider exporting your files first.
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
