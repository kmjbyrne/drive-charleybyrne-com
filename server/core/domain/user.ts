export interface LocalUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
  /** Storage limit in bytes. null means the configured default applies. */
  quotaBytes: number | null
  lastSeenAt: Date
}
