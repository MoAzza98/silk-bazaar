'use client'
import SessionWrapper from '@/components/SessionWrapper'
import Nav from '@/components/Nav'
import HeroSection from '@/components/HeroSection'
import ManifestoSection from '@/components/ManifestoSection'
import PetalRibbonSection from '@/components/PetalRibbonSection'
import RegisterSection from '@/components/RegisterSection'

export default function Home() {
  return (
    <SessionWrapper>
      <main>
        <Nav />
        <HeroSection />
        <ManifestoSection />
        <PetalRibbonSection />
        <RegisterSection />
      </main>
    </SessionWrapper>
  )
}
