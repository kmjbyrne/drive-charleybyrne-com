export interface LocalUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
  lastSeenAt: Date
}
