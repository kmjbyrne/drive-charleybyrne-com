import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { useDatabase } from '../database'

export default defineNitroPlugin(() => {
  const db = useDatabase()
  const migrationsFolder = process.env.MIGRATIONS_PATH || './server/database/migrations'
  migrate(db, { migrationsFolder })
  console.log('[migrate] Database migrations applied successfully')
})
