import type { Person } from './types'

export const PEOPLE: Person[] = [
  { id: 'j', name: 'James', color: '#22c55e', initials: 'JM', email: 'james@example.com' },
  { id: 'a', name: 'Alex', color: '#3b82f6', initials: 'AK', email: 'alex@example.com' },
  { id: 'm', name: 'Maya', color: '#f59e0b', initials: 'MR', email: 'maya@example.com' },
  { id: 's', name: 'Sam', color: '#ec4899', initials: 'SP', email: 'sam@example.com' },
  { id: 'o', name: 'Olivia', color: '#8b5cf6', initials: 'OW', email: 'olivia@example.com' }
]

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find(p => p.id === id)
}
