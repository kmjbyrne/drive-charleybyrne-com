export function deriveFileType(ext: string | null | undefined, entryType: string): string {
  if (entryType === 'folder') return 'folder'
  const e = ext?.toLowerCase()
  if (!e) return 'file'
  if (['.pdf'].includes(e)) return 'pdf'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.svg', '.bmp'].includes(e)) return 'image'
  if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(e)) return 'audio'
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(e)) return 'video'
  if (['.fig', '.sketch', '.xd'].includes(e)) return 'design'
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.kt', '.kts', '.c', '.cpp', '.cs', '.php', '.swift', '.dart', '.lua', '.r', '.sql', '.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.css', '.scss', '.less', '.html', '.vue'].includes(e)) return 'code'
  if (['.zip', '.tar', '.gz', '.rar', '.7z'].includes(e)) return 'zip'
  if (['.md', '.mdx'].includes(e)) return 'markdown'
  if (['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(e)) return 'doc'
  if (['.xls', '.xlsx', '.csv'].includes(e)) return 'doc'
  if (['.ppt', '.pptx'].includes(e)) return 'doc'
  if (['.json', '.yaml', '.yml', '.toml', '.xml', '.env', '.ini', '.cfg', '.conf', '.properties', '.gradle'].includes(e)) return 'code'
  return 'file'
}

export function isEditableText(ext: string | null | undefined): boolean {
  const type = deriveFileType(ext, 'file')
  if (type === 'code' || type === 'markdown') return true
  const e = ext?.toLowerCase()
  if (!e) return false
  return ['.txt', '.log', '.env', '.gitignore', '.dockerignore', '.editorconfig'].includes(e)
}
