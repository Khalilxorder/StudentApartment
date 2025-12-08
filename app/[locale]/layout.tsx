import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/Providers";
import { OrganizationStructuredData } from "@/components/seo/OrganizationStructuredData";
import CookieConsent from "@/components/privacy/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import dynamic from "next/dynamic";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

// Dynamic import with SSR disabled to prevent hydration mismatch
const UserAuthStatus = dynamic(() => import("@/components/UserAuthStatus"), {
    ssr: false,
    loading: () => (
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
        </div>
    ),
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        default: "Student Apartments Budapest | AI-Powered Search",
        template: "%s | Student Apartments Budapest"
    },
    description: "Find your perfect student apartment in Budapest with AI-powered matching. Search thousands of verified listings with intelligent recommendations based on your preferences.",
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
        apple: '/favicon.svg',
    },
};

export default async function LocaleLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();

    return (
        <NextIntlClientProvider messages={messages}>
            <OrganizationStructuredData />
            <Providers>
                <UserAuthStatus />
                <div id="main-content" className="flex-1 overflow-y-auto">
                    {children}
                </div>
                <CookieConsent />
            </Providers>
            <GoogleAnalytics />
        </NextIntlClientProvider>
    );
}
