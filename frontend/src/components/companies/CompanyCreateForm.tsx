import LoadingState from '../ui/LoadingState'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import FormTextarea from '../ui/FormTextarea'
import SlidePanel from '../ui/SlidePanel'
import MultiSelect from '../ui/MultiSelect'
import Button from '../ui/Button'
import { cn } from '../../lib/cn'
import type { ChatworkRoom, User } from '../../types'

export type CompanyFormState = {
  name: string
  category: string
  status: string
  ownerIds: string[]
  tags: string
  profile: string
}

export type CompanyCreateFormProps = {
  isOpen: boolean
  isAdmin: boolean
  showChatworkSelector: boolean
  onToggleChatworkSelector: (nextOpen: boolean) => void
  onClose: () => void
  roomSearchQuery: string
  onRoomSearchChange: (value: string) => void
  isLoadingRooms: boolean
  chatworkRooms: ChatworkRoom[]
  filteredChatworkRooms: ChatworkRoom[]
  onRoomSelect: (room: ChatworkRoom) => void
  selectedRoomId: string
  form: CompanyFormState
  onFormChange: (next: CompanyFormState) => void
  onSubmit: (event: React.FormEvent) => void
  tagOptions: string[]
  userOptions: User[]
  categoryOptions: string[]
  statusOptions: string[]
}

function CompanyCreateForm({
  isOpen,
  isAdmin,
  showChatworkSelector,
  onToggleChatworkSelector,
  onClose,
  roomSearchQuery,
  onRoomSearchChange,
  isLoadingRooms,
  chatworkRooms,
  filteredChatworkRooms,
  onRoomSelect,
  selectedRoomId,
  form,
  onFormChange,
  onSubmit,
  tagOptions,
  userOptions,
  categoryOptions,
  statusOptions,
}: CompanyCreateFormProps) {
  if (!isOpen) return null

  const ownerOptions = userOptions.map((user) => ({
    value: user.id,
    label: user.name || user.email,
  }))

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="企業を追加"
      description="Chatwork連携または手動入力で追加できます。"
      size="lg"
    >
      <div className="space-y-6">
        {isAdmin ? (
          <details
            open={showChatworkSelector}
            onToggle={(event) => onToggleChatworkSelector(event.currentTarget.open)}
            className="rounded-xl border border-notion-border bg-notion-bg-secondary p-4"
          >
            <summary className="flex cursor-pointer items-center justify-between rounded-lg text-sm font-semibold text-notion-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40 [&::-webkit-details-marker]:hidden">
              Chatwork連携
              <span className="text-xs text-notion-text-tertiary">任意</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-notion-text-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <FormInput
                  type="text"
                  className="pl-9"
                  placeholder="Chatwork Room IDまたはルーム名で検索"
                  value={roomSearchQuery}
                  onChange={(e) => onRoomSearchChange(e.target.value)}
                />
              </div>
              {isLoadingRooms ? (
                <LoadingState className="py-4" message="Chatworkルームを読み込み中..." />
              ) : chatworkRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-notion-border bg-notion-bg px-4 py-3 text-sm text-notion-text-secondary">
                  Chatworkルームが見つかりません。同期を実行してください。
                </div>
              ) : filteredChatworkRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-notion-border bg-notion-bg px-4 py-3 text-sm text-notion-text-secondary">
                  「{roomSearchQuery}」に一致するルームが見つかりません。
                </div>
              ) : (
                <div className="max-h-72 divide-y divide-notion-border overflow-y-auto rounded-xl border border-notion-border">
                  {filteredChatworkRooms.map((room) => {
                    const isSelected = selectedRoomId === room.roomId
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => onRoomSelect(room)}
                        className={cn(
                          'flex w-full items-start justify-between gap-4 px-4 py-3 text-left',
                          isSelected ? 'bg-notion-bg-hover' : 'bg-notion-bg'
                        )}
                      >
                        <div>
                          <div className="font-medium text-notion-text">{room.name}</div>
                          {room.description && (
                            <div className="mt-1 line-clamp-1 text-xs text-notion-text-secondary">{room.description}</div>
                          )}
                          <div className="mt-1 text-xs text-notion-text-tertiary">Room ID: {room.roomId}</div>
                        </div>
                        <span
                          className={cn(
                            'mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            isSelected
                              ? 'bg-notion-accent text-white'
                              : 'bg-notion-bg-hover text-notion-text-tertiary'
                          )}
                        >
                          追加
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </details>
        ) : (
          <div className="rounded-xl border border-dashed border-notion-border bg-notion-bg px-4 py-3 text-xs text-notion-text-tertiary">
            Chatwork連携は管理者のみ利用できます。
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {selectedRoomId && (
            <div className="rounded-lg border border-notion-border bg-notion-bg-secondary px-3 py-2 text-sm text-notion-text-secondary">
              Chatwork連携: {form.name} (Room ID: {selectedRoomId})
            </div>
          )}

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-notion-text text-balance">基本情報</h3>
              <p className="text-xs text-notion-text-tertiary">企業の名称と概要を入力します。</p>
            </div>
            <div className="grid gap-4">
              <FormInput
                placeholder="企業名（必須）"
                value={form.name}
                onChange={(event) => onFormChange({ ...form, name: event.target.value })}
                required
              />
              <FormTextarea
                className="min-h-[88px]"
                placeholder="プロフィールを入力"
                value={form.profile}
                onChange={(event) => onFormChange({ ...form, profile: event.target.value })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-notion-text text-balance">分類</h3>
              <p className="text-xs text-notion-text-tertiary">カテゴリやステータスを設定します。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect
                value={form.category}
                onChange={(event) => onFormChange({ ...form, category: event.target.value })}
              >
                <option value="">区分</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                value={form.status}
                onChange={(event) => onFormChange({ ...form, status: event.target.value })}
              >
                <option value="">ステータス</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FormSelect>
              <div className="relative md:col-span-2">
                <FormInput
                  placeholder="タグを追加: VIP, 重要"
                  value={form.tags}
                  onChange={(event) => onFormChange({ ...form, tags: event.target.value })}
                  list="form-tag-options"
                />
                <datalist id="form-tag-options">
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-notion-text text-balance">管理</h3>
              <p className="text-xs text-notion-text-tertiary">担当者を割り当てます。</p>
            </div>
            <MultiSelect
              value={form.ownerIds}
              options={ownerOptions}
              onChange={(next) => onFormChange({ ...form, ownerIds: next })}
              label="担当者"
              placeholder="担当者を選択"
            />
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit">登録</Button>
          </div>
        </form>
      </div>
    </SlidePanel>
  )
}

export default CompanyCreateForm
