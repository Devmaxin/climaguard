export type NavigationItem = {
  label: string
  to: string
  end?: boolean
}

export const productNavigation: NavigationItem[] = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Technology', to: '/#technology' },
  { label: 'Use cases', to: '/#use-cases' },
]

export const utilityNavigation: NavigationItem[] = [
  { label: 'Overview', to: '/', end: true },
  { label: 'Foundation', to: '/system' },
]
