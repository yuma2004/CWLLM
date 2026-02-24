import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ChatworkSettings from './ChatworkSettings'
import { useChatworkSettingsPage } from '../features/chatwork/useChatworkSettingsPage'

vi.mock('../features/chatwork/useChatworkSettingsPage', () => ({
  useChatworkSettingsPage: vi.fn(),
}))

const mockUseChatworkSettingsPage = vi.mocked(useChatworkSettingsPage)

const createHookState = (
  overrides: Partial<ReturnType<typeof useChatworkSettingsPage>> = {}
): ReturnType<typeof useChatworkSettingsPage> => ({
  canManageChatwork: true,
  activeJob: null,
  setActiveJob: vi.fn(),
  roomQuery: '',
  setRoomQuery: vi.fn(),
  roomFilter: 'all',
  setRoomFilter: vi.fn(),
  selectedRoomIds: [],
  setSelectedRoomIds: vi.fn(),
  isBulkUpdating: false,
  toast: null,
  clearToast: vi.fn(),
  isLoadingRooms: false,
  refetchRooms: vi.fn(async () => null),
  refetchJob: vi.fn(async () => null),
  showToast: vi.fn(),
  filteredRooms: [],
  totalRooms: 0,
  currentPage: 1,
  pagedRooms: [],
  selectedRoomSet: new Set<string>(),
  allFilteredSelected: false,
  hasRoomFilters: false,
  roomFilterLabel: 'All',
  isQueueingRooms: false,
  isQueueingMessages: false,
  errorMessage: '',
  handleRoomSync: vi.fn(async () => {}),
  handleMessageSync: vi.fn(async () => {}),
  handleToggle: vi.fn(async () => {}),
  handleRoomQueryChange: vi.fn(),
  handleRoomFilterChange: vi.fn(),
  handleClearRoomFilters: vi.fn(),
  handleRoomPageSizeChange: vi.fn(),
  toggleSelectRoom: vi.fn(),
  toggleSelectAllFiltered: vi.fn(),
  handleBulkToggle: vi.fn(async () => {}),
  handleCancelJob: vi.fn(async () => {}),
  ...overrides,
})

describe('ChatworkSettings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows permission message when user cannot manage chatwork', () => {
    mockUseChatworkSettingsPage.mockReturnValue(
      createHookState({
        canManageChatwork: false,
      })
    )

    render(<ChatworkSettings />)

    expect(screen.getByText('権限が不足しているため、Chatwork設定を表示できません。')).toBeInTheDocument()
  })

  it('renders room list and triggers room actions', () => {
    const handleRoomSync = vi.fn(async () => {})
    const handleToggle = vi.fn(async () => {})
    const toggleSelectRoom = vi.fn()
    const room = {
      id: 'room-local-1',
      roomId: '100',
      name: '営業部',
      isActive: true,
      description: null,
      lastSyncAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastErrorStatus: null,
    }

    mockUseChatworkSettingsPage.mockReturnValue(
      createHookState({
        totalRooms: 1,
        pagedRooms: [room],
        filteredRooms: [room],
        handleRoomSync,
        handleToggle,
        toggleSelectRoom,
      })
    )

    render(<ChatworkSettings />)

    expect(screen.getByTestId('chatwork-room-item')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('chatwork-room-sync'))
    fireEvent.click(screen.getByRole('button', { name: '有効' }))
    fireEvent.click(screen.getByRole('checkbox'))

    expect(handleRoomSync).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledWith(room)
    expect(toggleSelectRoom).toHaveBeenCalledWith('room-local-1')
  })
})

