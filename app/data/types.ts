export type FileType = 'folder' | 'doc' | 'pdf' | 'image' | 'video' | 'audio' | 'markdown' | 'design' | 'code' | 'zip' | 'file'

export type SpaceType = 'space'

export type NodeType = FileType | SpaceType | 'root'

export interface Person {
  id: string
  name: string
  color: string
  initials: string
  email: string
}

export interface Tag {
  id: string
  label: string
  color: string
}

export interface Space {
  id: string
  name: string
  icon: string
  color: string
}

export interface FileNode {
  id: string
  name: string
  type: NodeType
  ext?: string
  size?: string
  modified?: string
  members?: string[]
  starred?: boolean
  owner?: string
  editable?: boolean
  color?: string
  children?: FileNode[]
  // Path to a real file in public/mock-files/ for preview/editing
  mockFile?: string
}

export interface FileTypeConfig {
  icon: string
  bg: string
  fg: string
  tag: string
}
