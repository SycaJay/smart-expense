export type PodTypeId = 'shared_residence' | 'trip' | 'short_stay' | 'other'

export type DefaultSplitMethod = 'equal' | 'weighted'

export interface PodCategoryTemplate {
  id: string
  label: string
  /** Shown on the main Pod dashboard by default */
  dashboardDefault: boolean
}

export interface PodTypePreset {
  id: PodTypeId
  title: string
  shortLabel: string
  emoji: string
  isDefault: boolean
  tagline: string
  detail: string
  suggestedSplit: DefaultSplitMethod
  categories: PodCategoryTemplate[]
  layoutNote: string
}

export const POD_TYPE_PRESETS: PodTypePreset[] = [
  {
    id: 'shared_residence',
    title: 'Shared Residence',
    shortLabel: 'Home',
    emoji: '🏠',
    isDefault: true,
    tagline: 'Roommates, rent, utilities & groceries',
    detail:
      'Built for ongoing shared living: recurring bills, steady categories, and a dashboard tuned for month-to-month spending.',
    suggestedSplit: 'equal',
    layoutNote: 'Prioritizes rent, utilities & food on your overview.',
    categories: [
      { id: 'rent', label: 'Rent', dashboardDefault: true },
      { id: 'utilities', label: 'Utilities', dashboardDefault: true },
      { id: 'food', label: 'Food', dashboardDefault: true },
      { id: 'transport', label: 'Transport', dashboardDefault: true },
      { id: 'internet', label: 'Internet', dashboardDefault: true },
    ],
  },
  {
    id: 'trip',
    title: 'Trip',
    shortLabel: 'Trip',
    emoji: '✈️',
    isDefault: false,
    tagline: 'Flights, hotels, food & activities',
    detail:
      'Optimized for travel: big one-off purchases, per-day spending, and quick splits while you move.',
    suggestedSplit: 'equal',
    layoutNote: 'Highlights transport & accommodation first, then food & fun.',
    categories: [
      { id: 'flights_transport', label: 'Flights / Transport', dashboardDefault: true },
      { id: 'hotel', label: 'Hotel / Accommodation', dashboardDefault: true },
      { id: 'food', label: 'Food', dashboardDefault: true },
      { id: 'activities', label: 'Activities', dashboardDefault: true },
    ],
  },
  {
    id: 'short_stay',
    title: 'Short Stay',
    shortLabel: 'Stay',
    emoji: '🧳',
    isDefault: false,
    tagline: 'Airbnb, visits & short-term stays',
    detail:
      'For a few nights or a sublet: lighter categories, flexible labels, and fast settle-up when you leave.',
    suggestedSplit: 'equal',
    layoutNote: 'Puts accommodation & food up front for short trips.',
    categories: [
      { id: 'accommodation', label: 'Accommodation', dashboardDefault: true },
      { id: 'food', label: 'Food', dashboardDefault: true },
      { id: 'transport', label: 'Transport', dashboardDefault: true },
      { id: 'misc', label: 'Miscellaneous', dashboardDefault: false },
    ],
  },
  {
    id: 'other',
    title: 'Other / General',
    shortLabel: 'Other',
    emoji: '👥',
    isDefault: false,
    tagline: 'Projects, events & custom groups',
    detail:
      'Start minimal and shape the Pod yourself — add categories, rename anything, and choose what appears on the dashboard.',
    suggestedSplit: 'equal',
    layoutNote: 'You choose what matters most on the overview.',
    categories: [
      { id: 'general', label: 'General', dashboardDefault: true },
      { id: 'custom', label: 'Custom expense', dashboardDefault: false },
    ],
  },
]

export function getPreset(id: PodTypeId): PodTypePreset {
  const p = POD_TYPE_PRESETS.find((x) => x.id === id)
  if (!p) return POD_TYPE_PRESETS[0]
  return p
}
