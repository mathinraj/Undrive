import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://undrive.app"),
  title: {
    default: "Undrive — Your Drive, unseen.",
    template: "%s | Undrive",
  },
  description:
    "Store files in Google Drive's hidden folder. Invisible from Drive UI, accessible only through Undrive. Free, private, zero-server storage.",
  keywords: [
    "Google Drive",
    "hidden storage",
    "private files",
    "appDataFolder",
    "secret drive",
    "file vault",
    "Undrive",
  ],
  authors: [{ name: "Undrive" }],
  creator: "Undrive",
  openGraph: {
    title: "Undrive — Your Drive, unseen.",
    description:
      "Hidden file storage inside your own Google Drive. Invisible, private, and free.",
    url: "https://undrive.app",
    siteName: "Undrive",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Undrive — Hidden storage in your Google Drive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Undrive — Your Drive, unseen.",
    description:
      "Hidden file storage inside your own Google Drive. Invisible, private, and free.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
