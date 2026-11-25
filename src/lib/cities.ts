import type { CityKey } from '@/lib/supabase/database.types'

/**
 * The three launch markets. These keys are the only values the database accepts
 * in `monitored_locations.city_key`, so this list is the single place the UI
 * learns which places exist.
 */
export type City = {
  key: CityKey
  name: string
  country: string
  region: string
  summary: string
  exposures: string[]
}

export const cities: City[] = [
  {
    key: 'lagos',
    name: 'Lagos',
    country: 'Nigeria',
    region: 'West Africa',
    summary: 'A low-lying coastal megacity where flash flooding and heat stress shape daily life.',
    exposures: ['Flood', 'Heat', 'Coastal'],
  },
  {
    key: 'metro_manila',
    name: 'Metro Manila',
    country: 'Philippines',
    region: 'Southeast Asia',
    summary: 'A dense bay-side capital region exposed to typhoons, storm surge and urban flooding.',
    exposures: ['Storms', 'Flood', 'Coastal'],
  },
  {
    key: 'dhaka',
    name: 'Dhaka',
    country: 'Bangladesh',
    region: 'South Asia',
    summary: 'A delta capital facing monsoon flooding, extreme heat and severe air quality.',
    exposures: ['Flood', 'Heat', 'Air quality'],
  },
]

export const cityByKey = new Map(cities.map((city) => [city.key, city]))
