import type { Metadata } from "next";
import { VaultShell } from "@/components/vault-shell";

export const metadata: Metadata = {
  title: "Vault",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VaultShell>{children}</VaultShell>;
}
