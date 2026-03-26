'use client'
import SessionWrapper from '@/components/SessionWrapper'
import Nav from '@/components/Nav'
import HeroSection from '@/components/HeroSection'
import ManifestoSection from '@/components/ManifestoSection'
import RibbonSection from '@/components/RibbonSection'
import RegisterSection from '@/components/RegisterSection'

export default function Home() {
  return (
    <SessionWrapper>
      <main>
        <link rel="preload" as="image" href="/ribbon-bg.jpg" />
        <Nav />
        <HeroSection />
        <ManifestoSection />
        <RibbonSection />
        <RegisterSection />
      </main>
    </SessionWrapper>
  )
}
