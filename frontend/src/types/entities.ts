// Task 型
export interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  dueDate?: string | null
  targetType: string
  targetId: string
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
  company?: {
    id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}
