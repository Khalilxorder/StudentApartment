import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { OrganizationStructuredData } from "@/components/seo/OrganizationStructuredData";
import CookieConsent from "@/components/privacy/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import UserAuthStatus from "@/components/UserAuthStatus";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Student Apartments Budapest | AI-Powered Search",
    template: "%s | Student Apartments Budapest"
  },
  description: "Find your perfect student apartment in Budapest with AI-powered matching. Search thousands of verified listings with intelligent recommendations based on your preferences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <OrganizationStructuredData />
        <Providers>
          <UserAuthStatus />
          <div id="main-content" className="flex-1 overflow-y-auto">
            {children}
          </div>
          <CookieConsent />
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
