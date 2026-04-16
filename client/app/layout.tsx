import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "./providers"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Freelance - Zero Commission. AI Matched.",
  description: "Web3-powered freelance platform with AI matching and smart escrow",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

import AuthGuard from "@/components/auth-guard" 
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { NotificationListener } from "@/components/notification-listener" 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Providers>
            <AuthGuard>
                {children}
            </AuthGuard>
          <Analytics />
          <Toaster />
          <HotToaster position="top-center" toastOptions={{ style: { background: '#1c1c1e', color: '#fff', border: '1px solid #3f3f46' } }} />
          <NotificationListener />
        </Providers>
      </body>
    </html>
  )
}
