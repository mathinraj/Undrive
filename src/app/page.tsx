"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield,
  HardDrive,
  LogIn,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/vault");
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-xl font-bold tracking-tight">Undrive</span>
        </div>
        <Button
          onClick={() => signIn("google", { callbackUrl: "/vault" })}
          variant="outline"
          className="gap-2"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Hidden storage in your own Google Drive
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your Drive,{" "}
            <span className="bg-gradient-to-r from-violet-500 to-violet-700 bg-clip-text text-transparent">
              unseen.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Store personal files in Google Drive&apos;s hidden app folder —
            invisible from the Drive UI, accessible only through Undrive.
            Uses your own storage quota.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => signIn("google", { callbackUrl: "/vault" })}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Learn more
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: LogIn,
                title: "1. Sign in with Google",
                desc: "Authorize Undrive to access your Drive's hidden app folder. We only request minimal permissions.",
              },
              {
                icon: EyeOff,
                title: "2. Upload your files",
                desc: "Files are stored in Google Drive's appDataFolder — a special hidden area that doesn't appear in your normal Drive.",
              },
              {
                icon: HardDrive,
                title: "3. Access anytime",
                desc: "Browse, download, and manage your hidden files through Undrive. They use your existing Google Drive quota.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="flex flex-col items-center text-center space-y-4 rounded-xl border bg-card p-8"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
                  <step.icon className="h-7 w-7 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-24 px-6 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Why Undrive?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Hidden Storage",
                desc: "Uses Google Drive's appDataFolder — completely invisible from the normal Drive UI.",
              },
              {
                title: "Your Quota",
                desc: "Files count against your existing Google Drive storage. No extra subscription needed.",
              },
              {
                title: "Minimal Permissions",
                desc: "We only request drive.appdata scope — we can't see or touch your regular Drive files.",
              },
              {
                title: "Zero Server Cost",
                desc: "Files go directly between your browser and Google. We never store or process your data.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-2 rounded-lg border p-6">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">FAQ</h2>
          <div className="space-y-8">
            {[
              {
                q: "Can Google see my files?",
                a: "Google stores the files, so technically they have access to the raw data. The files are hidden from Google Drive's UI but not encrypted in Phase 1. End-to-end encryption is coming in a future update.",
              },
              {
                q: "Does this count toward my storage?",
                a: "Yes. Files stored in appDataFolder use your normal Google Drive storage quota (15GB free, or whatever plan you have).",
              },
              {
                q: "Can I see these files in Google Drive?",
                a: "No. The appDataFolder is completely hidden from Drive's web UI, mobile apps, and desktop sync. Only Undrive can access them.",
              },
              {
                q: "What happens if I uninstall Undrive?",
                a: "Your files remain in the appDataFolder. You can reconnect Undrive anytime to access them again. You can also revoke access from Google Account settings, which deletes the hidden data.",
              },
              {
                q: "Is my data safe?",
                a: "Your files are as safe as anything in Google Drive. We never store, log, or process your files on our servers. Everything happens directly between your browser and Google's API.",
              },
            ].map((faq) => (
              <div key={faq.q} className="space-y-2">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="text-sm font-medium">Undrive</span>
            <span className="text-sm text-muted-foreground">
              — Your Drive, unseen.
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a
              href="#"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
