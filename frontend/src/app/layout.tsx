import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic MRI Analysis Copilot",
  description: "AI-assisted MRI analysis with CPU inference, retrieval grounding, and verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
