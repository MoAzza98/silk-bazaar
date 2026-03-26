import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import LenisProvider from "@/components/LenisProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Silk Bazaar — Where operators find their next project",
  description: "The discovery and acquisition platform for crypto projects. Connect underlevered assets with the operators built to scale them.",
  openGraph: {
    title: "Silk Bazaar — Where operators find their next project",
    description: "The discovery and acquisition platform for crypto projects. Connect underlevered assets with the operators built to scale them.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  )
}
