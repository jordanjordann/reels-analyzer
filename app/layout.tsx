import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { SidebarLayout } from "@/components/sidebar-layout";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reels Analyzer",
  description: "Single-user Instagram Reels analysis workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${firaCode.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <SidebarLayout>{children}</SidebarLayout>
        </Providers>
      </body>
    </html>
  );
}
