import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import './globals.css'
import { MusicPlayerProvider } from "@/components/MusicPlayerProvider"
import { AuthProvider } from "@/components/AuthContext"
import GlobalMusicPlayer from "./components/Layout/MusicPlayer"


const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MusicPlayerProvider>
            {children}
            <GlobalMusicPlayer />
          </MusicPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}