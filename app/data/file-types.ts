import type { FileTypeConfig, FileType } from './types'

export const FILE_TYPES: Record<FileType, FileTypeConfig> = {
  folder: { icon: 'i-vscode-icons-default-folder', bg: 'transparent', fg: '', tag: 'Folder' },
  doc: { icon: 'i-vscode-icons-file-type-word', bg: 'transparent', fg: '', tag: 'Word' },
  pdf: { icon: 'i-vscode-icons-file-type-pdf2', bg: 'transparent', fg: '', tag: 'PDF' },
  image: { icon: 'i-vscode-icons-file-type-image', bg: 'transparent', fg: '', tag: 'Image' },
  video: { icon: 'i-vscode-icons-file-type-video', bg: 'transparent', fg: '', tag: 'Video' },
  audio: { icon: 'i-vscode-icons-file-type-audio', bg: 'transparent', fg: '', tag: 'Audio' },
  markdown: { icon: 'i-vscode-icons-file-type-markdown', bg: 'transparent', fg: '', tag: 'Markdown' },
  design: { icon: 'i-vscode-icons-file-type-figma', bg: 'transparent', fg: '', tag: 'Figma' },
  code: { icon: 'i-vscode-icons-file-type-typescript', bg: 'transparent', fg: '', tag: 'Code' },
  zip: { icon: 'i-vscode-icons-file-type-zip', bg: 'transparent', fg: '', tag: 'Archive' },
  file: { icon: 'i-vscode-icons-default-file', bg: 'transparent', fg: '', tag: 'File' }
}

// Extension-specific icons for code files and other detailed types
export const EXT_ICON_MAP: Record<string, string> = {
  // Code
  '.ts': 'i-vscode-icons-file-type-typescript',
  '.tsx': 'i-vscode-icons-file-type-typescript',
  '.js': 'i-vscode-icons-file-type-js',
  '.jsx': 'i-vscode-icons-file-type-js',
  '.vue': 'i-vscode-icons-file-type-vue',
  '.py': 'i-vscode-icons-file-type-python',
  '.rb': 'i-vscode-icons-file-type-ruby',
  '.go': 'i-vscode-icons-file-type-go',
  '.rs': 'i-vscode-icons-file-type-rust',
  '.java': 'i-vscode-icons-file-type-java',
  '.c': 'i-vscode-icons-file-type-c',
  '.cpp': 'i-vscode-icons-file-type-cpp',
  '.cs': 'i-vscode-icons-file-type-csharp',
  '.php': 'i-vscode-icons-file-type-php',
  '.swift': 'i-vscode-icons-file-type-swift',
  '.kt': 'i-vscode-icons-file-type-kotlin',
  '.kts': 'i-vscode-icons-file-type-kotlin',
  '.dart': 'i-vscode-icons-file-type-dart',
  '.sh': 'i-vscode-icons-file-type-shell',
  '.bash': 'i-vscode-icons-file-type-shell',
  '.zsh': 'i-vscode-icons-file-type-shell',
  '.bat': 'i-vscode-icons-file-type-shell',
  '.cmd': 'i-vscode-icons-file-type-shell',
  '.ps1': 'i-vscode-icons-file-type-shell',
  '.r': 'i-vscode-icons-file-type-r',
  '.lua': 'i-vscode-icons-file-type-lua',
  '.sql': 'i-vscode-icons-file-type-sql',

  // Config / data
  '.json': 'i-vscode-icons-file-type-json',
  '.yaml': 'i-vscode-icons-file-type-yaml',
  '.yml': 'i-vscode-icons-file-type-yaml',
  '.toml': 'i-vscode-icons-file-type-toml',
  '.xml': 'i-vscode-icons-file-type-xml',
  '.env': 'i-vscode-icons-file-type-dotenv',
  '.ini': 'i-vscode-icons-file-type-config',
  '.cfg': 'i-vscode-icons-file-type-config',
  '.conf': 'i-vscode-icons-file-type-config',
  '.properties': 'i-vscode-icons-file-type-config',
  '.gradle': 'i-vscode-icons-file-type-gradle',
  '.csv': 'i-vscode-icons-file-type-excel',

  // Web
  '.html': 'i-vscode-icons-file-type-html',
  '.css': 'i-vscode-icons-file-type-css',
  '.scss': 'i-vscode-icons-file-type-scss',
  '.sass': 'i-vscode-icons-file-type-sass',
  '.less': 'i-vscode-icons-file-type-less',
  '.svg': 'i-vscode-icons-file-type-svg',

  // Docs
  '.md': 'i-vscode-icons-file-type-markdown',
  '.docx': 'i-vscode-icons-file-type-word',
  '.doc': 'i-vscode-icons-file-type-word',
  '.pdf': 'i-vscode-icons-file-type-pdf2',
  '.txt': 'i-vscode-icons-file-type-text',
  '.xlsx': 'i-vscode-icons-file-type-excel',
  '.xls': 'i-vscode-icons-file-type-excel',
  '.pptx': 'i-vscode-icons-file-type-powerpoint',
  '.ppt': 'i-vscode-icons-file-type-powerpoint',

  // Images
  '.png': 'i-vscode-icons-file-type-image',
  '.jpg': 'i-vscode-icons-file-type-image',
  '.jpeg': 'i-vscode-icons-file-type-image',
  '.gif': 'i-vscode-icons-file-type-image',
  '.webp': 'i-vscode-icons-file-type-image',

  // Archives
  '.zip': 'i-vscode-icons-file-type-zip',
  '.tar': 'i-vscode-icons-file-type-zip',
  '.gz': 'i-vscode-icons-file-type-zip',
  '.rar': 'i-vscode-icons-file-type-zip',

  // Docker / CI
  '.dockerfile': 'i-vscode-icons-file-type-docker',
  '.dockerignore': 'i-vscode-icons-file-type-docker',

  // Git
  '.gitignore': 'i-vscode-icons-file-type-git',
}
