import type {
  ApiListResponse,
  Company,
  DashboardResponse,
  Project,
  Task,
  User,
  Wholesale,
} from '../../types'

const DEFAULT_DATE = '2026-01-01T00:00:00.000Z'

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'admin@example.com',
  name: '管理者',
  role: 'admin',
  createdAt: DEFAULT_DATE,
  ...overrides,
})

export const createCompany = (overrides: Partial<Company> = {}): Company => ({
  id: 'company-1',
  name: '株式会社テスト',
  category: '商社',
  status: 'active',
  tags: [],
  ownerIds: [],
  profile: null,
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  ...overrides,
})

export const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: '検証案件',
  companyId: 'company-1',
  status: 'active',
  conditions: null,
  unitPrice: 100000,
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
  ownerId: 'user-1',
  company: { id: 'company-1', name: '株式会社テスト' },
  owner: { id: 'user-1', email: 'admin@example.com', name: '管理者' },
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  ...overrides,
})

export const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'テストタスク',
  description: null,
  status: 'todo',
  dueDate: '2026-01-31',
  targetType: 'company',
  targetId: 'company-1',
  target: { id: 'company-1', type: 'company', name: '株式会社テスト' },
  assigneeId: 'user-1',
  assignee: { id: 'user-1', email: 'admin@example.com', name: '管理者' },
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  ...overrides,
})

export const createWholesale = (overrides: Partial<Wholesale> = {}): Wholesale => ({
  id: 'wholesale-1',
  status: 'active',
  projectId: 'project-1',
  companyId: 'company-1',
  conditions: '条件メモ',
  unitPrice: 80000,
  margin: 12.5,
  agreedDate: '2026-01-15',
  ownerId: 'user-1',
  project: { id: 'project-1', name: '検証案件', company: { id: 'company-1', name: '株式会社テスト' } },
  company: { id: 'company-1', name: '株式会社テスト' },
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  ...overrides,
})

export const createDashboardResponse = (
  overrides: Partial<DashboardResponse> = {}
): DashboardResponse => ({
  overdueTasks: [],
  todayTasks: [],
  soonTasks: [],
  weekTasks: [],
  latestSummaries: [],
  recentCompanies: [],
  unassignedMessageCount: 0,
  ...overrides,
})

export const createListResponse = <T,>(
  items: T[],
  pagination: { page?: number; pageSize?: number; total?: number } = {}
): ApiListResponse<T> => ({
  items,
  pagination: {
    page: pagination.page ?? 1,
    pageSize: pagination.pageSize ?? 20,
    total: pagination.total ?? items.length,
  },
})
