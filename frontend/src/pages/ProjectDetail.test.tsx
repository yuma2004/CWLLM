import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectDetail from './ProjectDetail'
import { useProjectDetailPage } from '../features/projects/useProjectDetailPage'

vi.mock('../features/projects/useProjectDetailPage', () => ({
  useProjectDetailPage: vi.fn(),
}))

const mockUseProjectDetailPage = vi.mocked(useProjectDetailPage)

const createHookState = (
  overrides: Partial<ReturnType<typeof useProjectDetailPage>> = {}
): ReturnType<typeof useProjectDetailPage> => ({
  id: 'p1',
  canWrite: true,
  showCreateForm: false,
  setShowCreateForm: vi.fn(),
  form: {
    companyId: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  },
  setForm: vi.fn(),
  formError: '',
  isEditingProject: false,
  setIsEditingProject: vi.fn(),
  projectForm: {
    name: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    periodStart: '',
    periodEnd: '',
    ownerId: '',
  },
  setProjectForm: vi.fn(),
  projectFormError: '',
  editingWholesale: null,
  setEditingWholesale: vi.fn(),
  editForm: {
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  },
  setEditForm: vi.fn(),
  editError: '',
  deleteTarget: null,
  setDeleteTarget: vi.fn(),
  deleteError: '',
  toast: null,
  clearToast: vi.fn(),
  project: null,
  wholesales: [],
  isLoading: false,
  error: '',
  isCreatingWholesale: false,
  isDeletingWholesale: false,
  isUpdatingProject: false,
  userOptions: [],
  ownerLabel: '-',
  handleCancelProjectEdit: vi.fn(),
  handleUpdateProject: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
  handleCreateWholesale: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
  openEditModal: vi.fn(),
  handleUpdateWholesale: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
  handleDeleteWholesale: vi.fn(),
  confirmDeleteWholesale: vi.fn(async () => {}),
  ...overrides,
})

describe('ProjectDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows not found message when project is absent', () => {
    mockUseProjectDetailPage.mockReturnValue(createHookState())

    render(
      <MemoryRouter>
        <ProjectDetail />
      </MemoryRouter>
    )

    expect(screen.getByText('案件が見つかりません。')).toBeInTheDocument()
  })

  it('renders readonly state and empty wholesales message', () => {
    mockUseProjectDetailPage.mockReturnValue(
      createHookState({
        canWrite: false,
        project: {
          id: 'p1',
          name: 'Project A',
          companyId: 'c1',
          status: 'active',
          conditions: null,
          unitPrice: 1000,
          periodStart: null,
          periodEnd: null,
          ownerId: null,
          company: { id: 'c1', name: 'Acme' },
          owner: null,
        },
        wholesales: [],
      })
    )

    render(
      <MemoryRouter>
        <ProjectDetail />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Project A' })).toBeInTheDocument()
    expect(screen.getByText('卸がありません')).toBeInTheDocument()
    expect(screen.getByText('権限がないため、卸の追加・編集はできません。')).toBeInTheDocument()
  })
})

