import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import '../globals.css';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  
} from '@clerk/nextjs'
import { Inter } from "next/font/google"
import Topbar from "@/components/shared/Topbar";
import LeftSidebar from "@/components/shared/LeftSidebar";
import RightSidebar from "@/components/shared/RightSidebar";
import Bottombar from "@/components/shared/Bottombar";

const inter = Inter({subsets: ["latin"]})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title : 'Blackbook',
  description: 'Blackbook',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
    afterSignOutUrl="/" >
      <html lang="en">
        <body className={inter.className}>
            <Topbar />
                <main className="flex flex-row">
                  <LeftSidebar/>

                  <section className="main-container">
                    <div className="w-full max-w-4xl">
                        {children}
                    </div>
                  </section>

                  <RightSidebar/>
                </main>
            <Bottombar />
        </body>
      </html>
    </ClerkProvider>
      )
    }