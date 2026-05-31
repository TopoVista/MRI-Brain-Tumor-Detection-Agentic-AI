import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brain MRI Tumor Classification",
  description: "Upload a brain MRI and get a four-class prediction, model votes, and a plain result summary.",
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
