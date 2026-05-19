import type { FileNode } from './types'

export const TREE: FileNode = {
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
          starred: false,
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

export function findNode(node: FileNode, id: string): FileNode | null {
  if (node.id === id) return node
  if (!node.children) return null
  for (const child of node.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function getPath(node: FileNode, id: string, trail: FileNode[] = []): FileNode[] | null {
  const here = [...trail, node]
  if (node.id === id) return here
  if (!node.children) return null
  for (const child of node.children) {
    const result = getPath(child, id, here)
    if (result) return result
  }
  return null
}

export function allFiles(node: FileNode, out: FileNode[] = []): FileNode[] {
  if (!node.children) {
    if (node.type !== 'folder' && node.type !== 'space' && node.type !== 'root') {
      out.push(node)
    }
    return out
  }
  for (const child of node.children) {
    if (child.children) {
      allFiles(child, out)
    }
    else if (child.type !== 'folder' && child.type !== 'space' && child.type !== 'root') {
      out.push(child)
    }
  }
  return out
}

export function allStarred(node: FileNode, out: FileNode[] = []): FileNode[] {
  if (node.starred) out.push(node)
  if (node.children) {
    for (const child of node.children) {
      allStarred(child, out)
    }
  }
  return out
}

export function sortChildren(arr: FileNode[]): FileNode[] {
  return [...arr].sort((a, b) => {
    const af = a.type === 'folder' ? 0 : 1
    const bf = b.type === 'folder' ? 0 : 1
    if (af !== bf) return af - bf
    return a.name.localeCompare(b.name)
  })
}
