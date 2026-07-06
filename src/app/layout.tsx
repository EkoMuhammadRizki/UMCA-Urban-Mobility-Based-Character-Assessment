import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "UMCA — Urban Mobility-Based Character Assessment",
  description:
    "Dashboard pendukung riset Urban Mobility-Based Character Assessment (UMCA) — asesmen digital karakter kedisiplinan siswa SD berbasis NFC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
