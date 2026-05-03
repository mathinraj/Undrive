import {
  Shield,
  HardDrive,
  LogIn,
  ChevronDown,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SignInButton, GetStartedButton } from "@/components/sign-in-button";
import { AuthRedirect } from "@/components/auth-redirect";

const FAQ_DATA = [
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
];

export default function LandingPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Undrive",
    description:
      "Hidden file storage inside your own Google Drive. Invisible from Drive UI, accessible only through Undrive.",
    url: "https://undrive-app.vercel.app",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <AuthRedirect />

      <div className="flex min-h-screen flex-col bg-background">
        <nav
          className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-xl font-bold tracking-tight">Undrive</span>
          </div>
          <SignInButton />
        </nav>

        <main>
          {/* Hero */}
          <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
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
                <GetStartedButton />
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
          <section id="how-it-works" className="py-24 px-6" aria-labelledby="how-it-works-heading">
            <div className="max-w-5xl mx-auto">
              <h2 id="how-it-works-heading" className="text-3xl font-bold text-center mb-16">
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
                  <article
                    key={step.title}
                    className="flex flex-col items-center text-center space-y-4 rounded-xl border bg-card p-8"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
                      <step.icon className="h-7 w-7 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Trust signals */}
          <section className="py-24 px-6 border-t" aria-labelledby="why-undrive-heading">
            <div className="max-w-5xl mx-auto">
              <h2 id="why-undrive-heading" className="text-3xl font-bold text-center mb-16">
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
                  <article key={item.title} className="space-y-2 rounded-lg border p-6">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-24 px-6 border-t" aria-labelledby="faq-heading">
            <div className="max-w-3xl mx-auto">
              <h2 id="faq-heading" className="text-3xl font-bold text-center mb-16">
                FAQ
              </h2>
              <div className="space-y-8">
                {FAQ_DATA.map((faq) => (
                  <div key={faq.q} className="space-y-2">
                    <h3 className="text-lg font-semibold">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t py-8 px-6" role="contentinfo">
          <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Logo size={18} />
              <span className="text-sm font-medium">Undrive</span>
              <span className="text-sm text-muted-foreground">
                — Your Drive, unseen.
              </span>
            </div>
            <nav aria-label="Footer navigation" className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="text-muted-foreground/60">
                &copy; {new Date().getFullYear()} Undrive
              </span>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
