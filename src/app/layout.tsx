import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "UMCA — Urban Mobility-Based Character Assessment",
  description:
    "Dashboard pendukung riset Urban Mobility-Based Character Assessment (UMCA) — asesmen digital karakter kedisiplinan siswa SD berbasis NFC.",
  icons: {
    icon: "/logo/Logo-Putih-Circle.png",
    apple: "/logo/Logo-Putih-Circle.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
