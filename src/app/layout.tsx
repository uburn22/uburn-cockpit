import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ChatWrapper } from "@/components/chat/chat-wrapper";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uburn Cockpit",
  description: "Dashboard cockpit e-commerce — piloter l'acquisition vers 100 commandes/jour",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <ChatWrapper />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
