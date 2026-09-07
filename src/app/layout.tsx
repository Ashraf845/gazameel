import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { WelcomeBanner } from "@/shared/components/WelcomeBanner";
import { SessionKeepAlive } from "@/shared/components/SessionKeepAlive";
import { BRAND, TAGLINE_EN } from "@/shared/lib/constants";

/**
 * خط عربي عبر CSS (انظر globals.css) بدل next/font/google
 * حتى لا يفشل البناء بدون شبكة.
 */

export const metadata: Metadata = {
  title: `${BRAND} — منصة طلابية`,
  description: TAGLINE_EN,
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* dir=rtl لأن الواجهة عربية أولًا */
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("gazameel-theme")==="light")document.documentElement.classList.add("light-theme")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Navbar />
        <SessionKeepAlive />
        <WelcomeBanner />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
