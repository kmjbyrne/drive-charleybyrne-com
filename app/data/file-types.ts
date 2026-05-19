import type { FileTypeConfig, FileType } from './types'

export const FILE_TYPES: Record<FileType, FileTypeConfig> = {
  folder: { icon: 'i-lucide-folder', bg: 'transparent', fg: 'text-muted', tag: 'Folder' },
  doc: { icon: 'i-lucide-file-text', bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-600 dark:text-blue-400', tag: 'Word' },
  pdf: { icon: 'i-lucide-file-text', bg: 'bg-red-50 dark:bg-red-500/10', fg: 'text-red-600 dark:text-red-400', tag: 'PDF' },
  image: { icon: 'i-lucide-image', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', fg: 'text-fuchsia-600 dark:text-fuchsia-400', tag: 'Image' },
  video: { icon: 'i-lucide-video', bg: 'bg-purple-50 dark:bg-purple-500/10', fg: 'text-purple-600 dark:text-purple-400', tag: 'Video' },
  design: { icon: 'i-lucide-figma', bg: 'bg-orange-50 dark:bg-orange-500/10', fg: 'text-orange-600 dark:text-orange-400', tag: 'Figma' },
  code: { icon: 'i-lucide-file-code-2', bg: 'bg-cyan-50 dark:bg-cyan-500/10', fg: 'text-cyan-600 dark:text-cyan-400', tag: 'Code' },
  zip: { icon: 'i-lucide-archive', bg: 'bg-yellow-50 dark:bg-yellow-500/10', fg: 'text-yellow-600 dark:text-yellow-400', tag: 'Archive' }
}
