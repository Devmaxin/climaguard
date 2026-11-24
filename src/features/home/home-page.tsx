import { FinalCtaSection } from '@/features/home/components/final-cta-section'
import { HeroSection } from '@/features/home/components/hero-section'
import { HowItWorksSection } from '@/features/home/components/how-it-works-section'
import { ProblemSection } from '@/features/home/components/problem-section'
import { PrinciplesSection } from '@/features/home/components/principles-section'
import { SolutionSection } from '@/features/home/components/solution-section'
import { TechnologySection } from '@/features/home/components/technology-section'
import { UseCasesSection } from '@/features/home/components/use-cases-section'
import { useDocumentTitle } from '@/hooks/use-document-title'

function HomePage() {
  useDocumentTitle('Climate intelligence for everyday decisions')

  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <TechnologySection />
      <UseCasesSection />
      <PrinciplesSection />
      <FinalCtaSection />
    </>
  )
}

export { HomePage }
