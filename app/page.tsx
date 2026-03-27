'use client'
import dynamic from 'next/dynamic'
import SessionWrapper from '@/components/SessionWrapper'
import Nav from '@/components/Nav'
import HeroSection from '@/components/HeroSection'

// Below-fold — loaded after hero paints
const ManifestoSection  = dynamic(() => import('@/components/ManifestoSection'))
const FixedBackground   = dynamic(() => import('@/components/FixedBackground'))
const RibbonSection     = dynamic(() => import('@/components/RibbonSection'))
const HowItWorksSection = dynamic(() => import('@/components/HowItWorksSection'))
const AuctionsSection   = dynamic(() => import('@/components/AuctionsSection'))
const TheStallsSection  = dynamic(() => import('@/components/TheStallsSection'))
const RegisterSection   = dynamic(() => import('@/components/RegisterSection'))

export default function Home() {
  return (
    <SessionWrapper>
      <main>
        <link rel="preload" as="image" href="/hero-bg.webp" type="image/webp" />
        <link rel="preload" as="image" href="/ribbon-bg.webp" type="image/webp" />

        {/* Fixed bg at z:0 — ribbon image + fizzle canvas (below everything) */}
        <FixedBackground />

        {/* All sections stack above the fixed bg */}
        <Nav />
        <HeroSection />
        <ManifestoSection />
        <RibbonSection />
        <HowItWorksSection />
        <AuctionsSection />
        <TheStallsSection />
        <RegisterSection />
      </main>
    </SessionWrapper>
  )
}
