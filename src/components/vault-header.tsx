"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EyeOff, Settings, LogOut, Sun, Moon, Menu } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { formatFileSize } from "@/lib/file-utils";
import { Progress } from "@/components/ui/progress";

export function VaultHeader({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const quota = useVaultStore((s) => s.quota);
  const router = useRouter();

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const quotaPercent = quota
    ? Math.round((quota.usage / quota.limit) * 100)
    : 0;

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/vault" className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-violet-500" />
          <span className="font-bold tracking-tight">Undrive</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {quota && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-24">
              <Progress value={quotaPercent} className="h-1.5" />
            </div>
            <span>
              {formatFileSize(quota.usage)} / {formatFileSize(quota.limit)}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full cursor-pointer outline-none">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/vault/settings")}
              className="gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-2 cursor-pointer text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
