import type { Metadata } from "next";
import localFont from "next/font/local";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Apple's SF Pro (Text optical size), self-hosted so every platform gets it.
const sfPro = localFont({
  variable: "--font-sf-pro",
  src: [
    { path: "./fonts/SF-Pro-Text-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/SF-Pro-Text-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SF-Pro-Text-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/SF-Pro-Text-Bold.woff2", weight: "700", style: "normal" },
  ],
});

// Apple's New York (Extra Large optical size, for display sizes), self-hosted
// since the system copy is unreachable from CSS outside Safari.
const newYork = localFont({
  variable: "--font-new-york",
  src: [
    { path: "./fonts/NewYorkExtraLarge-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/NewYorkExtraLarge-RegularItalic.woff2", weight: "400", style: "italic" },
  ],
});

const DESCRIPTION =
  "Will it be sunny in West San Francisco, and when is the best weather window.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "West SF Weather",
  description: DESCRIPTION,
  openGraph: {
    title: "West SF Weather",
    description: DESCRIPTION,
    url: "/",
    siteName: "West SF Weather",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "West SF Weather",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sfPro.variable} ${newYork.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-dvh overflow-x-hidden bg-slate-500 font-sans text-white">
        {children}
      </body>
    </html>
  );
}
