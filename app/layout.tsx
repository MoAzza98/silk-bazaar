import type { Metadata } from "next"
import "./globals.css"
import LenisProvider from "@/components/LenisProvider"

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  )
}
