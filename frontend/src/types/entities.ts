// Task 型
export interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  dueDate?: string | null
  targetType: string
  targetId: string
  target?: {
    id: string
    type: string
    name: string
  }
  assigneeId?: string | null
  assignee?: {
    id: string
    email: string
  } | null
  createdAt?: string
  updatedAt?: string
}

// Wholesale 型
export interface Wholesale {
  id: string
  status: string
  projectId: string
  companyId: string
  conditions?: string | null
  unitPrice?: number | null
  margin?: number | null
  agreedDate?: string | null
  ownerId?: string | null
  project?: {
    id: string
    name: string
    company?: {
      id: string
      name: string
    }
  }
  company?: {
    id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

// Company 型
export interface Company {
  id: string
  name: string
  category?: string | null
  status: string
  tags: string[]
  ownerId?: string | null
  profile?: string | null
  owner?: {
    id: string
    email: string
  } | null
  createdAt?: string
  updatedAt?: string
}

// Project 型
export interface Project {
  id: string
  name: string
  companyId: string
  status?: string
  conditions?: string | null
  unitPrice?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  ownerId?: string | null
  company?: {
    id: string
    name: string
  }
  owner?: {
    id: string
    email: string
  } | null
  createdAt?: string
  updatedAt?: string
}

// User 型
export interface User {
  id: string
  email: string
  role?: string
}

export interface ChatworkRoom {
  id: string
  roomId: string
  name: string
  iconPath?: string
  companyId?: string
  description?: string | null
  isActive?: boolean
  lastSyncAt?: string | null
  lastErrorAt?: string | null
  lastErrorMessage?: string | null
  lastErrorStatus?: number | null
}

export interface Message {
  id: string
  body: string
  sendTime?: string
  sentAt?: string
  messageId?: string
  sender?: string
  account?: { name: string; avatarImageUrl?: string }
  roomId?: string
  room?: { name: string }
  companyId?: string | null
  labels?: string[]
}

export interface Contact {
  id: string
  name: string
  role?: string | null
  email?: string | null
  phone?: string | null
  memo?: string | null
  sortOrder?: number | null
}

export interface CompanyOptions {
  categories: string[]
  statuses: string[]
  tags: string[]
}

export interface AuditLog {
  id: string
  action: string
  userId?: string | null
  userEmail?: string | null
  createdAt: string
}

export interface Summary {
  id: string
  content: string
  type: string
  periodStart: string
  periodEnd: string
  sourceLinks: string[]
  createdAt: string
}

export interface SummaryDraft {
  id: string
  content: string
  periodStart: string
  periodEnd: string
  sourceLinks: string[]
  model?: string | null
  promptVersion?: string | null
  sourceMessageCount?: number | null
  tokenUsage?: unknown
}

export interface SummaryCandidate {
  title: string
  dueDate?: string
}

export interface JobRecord {
  id: string
  type?: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled'
  result?: Record<string, unknown> | null
  error?: { message?: string } | null
}

export interface MessageItem {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
  labels?: string[]
  companyId?: string | null
}

export interface LinkedRoom {
  id: string
  roomId: string
  name: string
  isActive: boolean
}

export interface AvailableRoom {
  id: string
  roomId: string
  name: string
  description?: string | null
  isActive: boolean
}
