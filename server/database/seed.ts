import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

const DB_PATH = process.env.DATABASE_PATH || './data/storage.db'
const DEFAULT_OWNER = 'j'

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

migrate(db, { migrationsFolder: './server/database/migrations' })

interface TreeNode {
  id: string
  name: string
  type: string
  ext?: string
  size?: string
  modified?: string
  members?: string[]
  starred?: boolean
  owner?: string
  editable?: boolean
  color?: string
  mockFile?: string
  children?: TreeNode[]
}

// Mirrors app/data/tree.ts
const TREE: TreeNode = {
  id: 'root',
  name: 'Storage',
  type: 'root',
  children: [
    {
      id: 'personal',
      name: 'Personal',
      type: 'space',
      color: '#00C16A',
      children: [
        {
          id: 'p-docs',
          name: 'Documents',
          type: 'folder',
          modified: 'Today, 2:14 PM',
          members: ['j'],
          children: [
            { id: 'f-q4', name: 'Q4 Plan', type: 'doc', ext: '.docx', size: '142 KB', modified: 'Today, 2:14 PM', members: ['j', 'a', 'm'], starred: true, owner: 'j', editable: true },
            { id: 'f-notes', name: 'meeting-notes', type: 'doc', ext: '.md', size: '24 KB', modified: 'Apr 18', members: ['j', 'a'], starred: false, owner: 'j' },
            { id: 'f-spec', name: 'spec', type: 'doc', ext: '.docx', size: '38 KB', modified: 'Apr 14', members: ['j'], starred: false, owner: 'j', editable: true },
            { id: 'f-letter', name: 'cover-letter', type: 'doc', ext: '.docx', size: '12 KB', modified: 'Mar 30', members: [], starred: false, owner: 'j', editable: true },
            { id: 'f-cv', name: 'keith-byrne-cv-2023', type: 'doc', ext: '.docx', size: '318 KB', modified: 'May 19', members: ['j'], starred: true, owner: 'j', editable: true, mockFile: '/mock-files/keith-byrne-cv-2023.docx' }
          ]
        },
        {
          id: 'p-photos',
          name: 'Photos',
          type: 'folder',
          modified: 'May 12',
          members: ['j'],
          children: [
            { id: 'f-img1', name: 'IMG_4521', type: 'image', ext: '.heic', size: '4.8 MB', modified: 'May 12', members: [], starred: false, owner: 'j' },
            { id: 'f-img2', name: 'IMG_4520', type: 'image', ext: '.heic', size: '5.1 MB', modified: 'May 12', members: [], starred: false, owner: 'j' },
            { id: 'f-img3', name: 'screen-recording', type: 'video', ext: '.mov', size: '64 MB', modified: 'Apr 12', members: [], starred: false, owner: 'j' }
          ]
        },
        {
          id: 'p-receipts',
          name: 'Receipts',
          type: 'folder',
          modified: 'Apr 30',
          members: ['j'],
          children: [
            { id: 'f-r1', name: 'home-depot', type: 'pdf', ext: '.pdf', size: '128 KB', modified: 'Apr 30', members: [], starred: false, owner: 'j' },
            { id: 'f-r2', name: 'electricity', type: 'pdf', ext: '.pdf', size: '64 KB', modified: 'Apr 28', members: [], starred: false, owner: 'j' }
          ]
        },
        { id: 'f-pdf-brand', name: 'Brand book v3', type: 'pdf', ext: '.pdf', size: '8.2 MB', modified: 'Today, 11:02 AM', members: ['j', 'm'], starred: false, owner: 'm' }
      ]
    },
    {
      id: 'family',
      name: 'Family',
      type: 'space',
      color: '#f59e0b',
      children: [
        {
          id: 'fam-photos',
          name: 'Family Photos 2025',
          type: 'folder',
          modified: 'Tuesday',
          members: ['j', 's'],
          children: [
            { id: 'f-fp1', name: 'beach-day', type: 'image', ext: '.jpg', size: '6.2 MB', modified: 'Tuesday', members: ['j', 's'], starred: false, owner: 's' },
            { id: 'f-fp2', name: 'birthday', type: 'image', ext: '.jpg', size: '4.4 MB', modified: 'May 14', members: ['j', 's'], starred: true, owner: 's' },
            { id: 'f-fp3', name: 'first-day', type: 'image', ext: '.jpg', size: '3.8 MB', modified: 'May 6', members: ['j', 's'], starred: false, owner: 's' }
          ]
        },
        {
          id: 'recipes',
          name: 'recipes',
          type: 'folder',
          modified: 'May 7',
          members: ['j', 's'],
          starred: true,
          children: [
            { id: 'f-rec1', name: 'pasta-amatriciana', type: 'doc', ext: '.docx', size: '18 KB', modified: 'May 7', members: ['j', 's'], starred: true, owner: 's', editable: true },
            { id: 'f-rec2', name: 'sourdough', type: 'doc', ext: '.md', size: '12 KB', modified: 'Apr 22', members: ['j', 's'], starred: false, owner: 's' }
          ]
        },
        {
          id: 'tax',
          name: 'tax-2024',
          type: 'folder',
          modified: 'Apr 30',
          members: ['j'],
          children: [
            { id: 'f-tax1', name: '1040-final', type: 'pdf', ext: '.pdf', size: '4.4 MB', modified: 'Apr 30', members: ['j'], starred: false, owner: 'j' },
            { id: 'f-tax2', name: 'W2-2024', type: 'pdf', ext: '.pdf', size: '186 KB', modified: 'Mar 12', members: ['j'], starred: false, owner: 'j' }
          ]
        },
        { id: 'f-kitchen', name: 'kitchen-remodel-walkthru', type: 'video', ext: '.mp4', size: '218 MB', modified: 'May 10', members: ['j'], starred: false, owner: 'j' }
      ]
    },
    {
      id: 'design',
      name: 'Design',
      type: 'space',
      color: '#ea580c',
      children: [
        {
          id: 'd-home',
          name: 'home-page',
          type: 'folder',
          modified: '14 min ago',
          members: ['a', 'm', 'o', 'j'],
          children: [
            { id: 'f-hv3', name: 'home-v3', type: 'design', ext: '.fig', size: '24.1 MB', modified: '14 min ago', members: ['a', 'm', 'o', 'j'], starred: true, owner: 'm' },
            { id: 'f-hv2', name: 'home-v2', type: 'design', ext: '.fig', size: '22.4 MB', modified: 'May 14', members: ['a', 'm', 'o'], starred: false, owner: 'm' },
            { id: 'f-hv1', name: 'home-v1', type: 'design', ext: '.fig', size: '18.2 MB', modified: 'May 10', members: ['a', 'm'], starred: false, owner: 'm' },
            { id: 'f-hr1', name: 'hero-render-01', type: 'image', ext: '.png', size: '6.4 MB', modified: 'May 12', members: ['m'], starred: false, owner: 'm' },
            { id: 'f-hr2', name: 'hero-render-02', type: 'image', ext: '.png', size: '6.2 MB', modified: 'May 12', members: ['m'], starred: false, owner: 'm' },
            { id: 'f-dspec', name: 'spec', type: 'doc', ext: '.docx', size: '46 KB', modified: 'May 11', members: ['a', 'm'], starred: false, owner: 'a', editable: true }
          ]
        },
        {
          id: 'd-brand',
          name: 'brand-2025',
          type: 'folder',
          modified: 'May 8',
          members: ['m', 'o'],
          children: [
            { id: 'f-tokens', name: 'system-tokens', type: 'design', ext: '.fig', size: '8.4 MB', modified: 'May 8', members: ['m', 'o'], starred: false, owner: 'm' },
            { id: 'f-guide', name: 'brand-guidelines', type: 'pdf', ext: '.pdf', size: '12 MB', modified: 'May 8', members: ['m', 'o'], starred: false, owner: 'm' }
          ]
        },
        {
          id: 'd-icons',
          name: 'icons-library',
          type: 'folder',
          modified: 'Apr 20',
          members: ['m'],
          children: [
            { id: 'f-zip', name: 'logo-exports', type: 'zip', ext: '.zip', size: '12 MB', modified: 'Apr 14', members: ['m'], starred: false, owner: 'm' }
          ]
        }
      ]
    },
    {
      id: 'code',
      name: 'Code Archive',
      type: 'space',
      color: '#0891b2',
      children: [
        { id: 'c-dot', name: 'dotfiles', type: 'code', ext: '.zip', size: '380 KB', modified: 'Apr 22', members: [], starred: false, owner: 'j' },
        {
          id: 'c-repo',
          name: 'snippets',
          type: 'folder',
          modified: 'Apr 3',
          members: ['j'],
          children: [
            { id: 'f-sn1', name: 'image-utils', type: 'code', ext: '.ts', size: '8 KB', modified: 'Apr 3', members: ['j'], starred: false, owner: 'j' }
          ]
        }
      ]
    }
  ]
}

const TAGS: { id: string, label: string, color: string, ownerId: string }[] = []

function parseSize(size?: string): number {
  if (!size) return 0
  const match = size.match(/^([\d.]+)\s*(KB|MB|GB)$/i)
  if (!match) return 0
  const value = parseFloat(match[1]!)
  const unit = match[2]!.toUpperCase()
  if (unit === 'KB') return Math.round(value * 1024)
  if (unit === 'MB') return Math.round(value * 1024 * 1024)
  if (unit === 'GB') return Math.round(value * 1024 * 1024 * 1024)
  return 0
}

function seedNode(
  node: TreeNode,
  spaceId: string,
  parentId: string | null
): void {
  const now = new Date()
  const isFolder = node.type === 'folder'
  const owner = node.owner || DEFAULT_OWNER

  db.insert(schema.fileEntries)
    .values({
      id: node.id,
      parentId,
      spaceId,
      name: node.name,
      type: isFolder ? 'folder' : 'file',
      mimeType: null,
      ext: node.ext || null,
      sizeBytes: parseSize(node.size),
      blobKey: null,
      ownerId: owner,
      starred: node.starred ?? false,
      createdAt: now,
      modifiedAt: now
    })
    .run()

  if (node.members) {
    for (const userId of node.members) {
      db.insert(schema.fileMembers)
        .values({ fileId: node.id, userId })
        .run()
    }
  }

  if (node.children) {
    for (const child of node.children) {
      seedNode(child, spaceId, node.id)
    }
  }
}

// Clear existing data
db.delete(schema.fileMembers).run()
db.delete(schema.fileTags).run()
db.delete(schema.fileEntries).run()
db.delete(schema.tags).run()
db.delete(schema.spaces).run()

// Seed tags
for (const tag of TAGS) {
  db.insert(schema.tags).values(tag).run()
}

// Seed spaces and their file trees
const root = TREE
if (root.children) {
  for (const spaceNode of root.children) {
    if (spaceNode.type !== 'space') continue

    db.insert(schema.spaces)
      .values({
        id: spaceNode.id,
        name: spaceNode.name,
        icon: 'folder',
        color: spaceNode.color || '#00C16A',
        ownerId: DEFAULT_OWNER,
        createdAt: new Date()
      })
      .run()

    if (spaceNode.children) {
      for (const child of spaceNode.children) {
        seedNode(child, spaceNode.id, null)
      }
    }
  }
}

console.log('Seed complete.')
sqlite.close()
