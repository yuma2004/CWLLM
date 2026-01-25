import LoadingState from '../ui/LoadingState'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import FormTextarea from '../ui/FormTextarea'
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
  onToggleChatworkSelector: () => void
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
}: CompanyCreateFormProps) {
  if (!isOpen) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">企業を追加</h3>
          <p className="mt-1 text-xs text-slate-500">Chatwork連携または手動入力で追加できます。</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!showChatworkSelector) {
                  onToggleChatworkSelector()
                }
              }}
              disabled={!isAdmin}
              title={!isAdmin ? '管理者のみ利用可能' : undefined}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                showChatworkSelector
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Chatworkから追加
            </button>
            <button
              type="button"
              onClick={() => {
                if (showChatworkSelector) {
                  onToggleChatworkSelector()
                }
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                showChatworkSelector
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-900 text-white'
              )}
            >
              手動入力
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
          aria-label="閉じる"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {showChatworkSelector ? (
        <div className="space-y-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
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
              className="h-11 bg-slate-50/70 pl-10 pr-4"
              placeholder="Chatwork Room IDまたはルーム名で検索"
              value={roomSearchQuery}
              onChange={(e) => onRoomSearchChange(e.target.value)}
            />
          </div>
          {isLoadingRooms ? (
            <LoadingState className="py-4" message="Chatworkルームを読み込み中..." />
          ) : chatworkRooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
              Chatworkルームが見つかりません。同期を実行してください。
            </div>
          ) : filteredChatworkRooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
              「${roomSearchQuery}」に一致するルームが見つかりません。
            </div>
          ) : (
            <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200">
              {filteredChatworkRooms.map((room) => {
                const isSelected = selectedRoomId === room.id
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onRoomSelect(room)}
                    className={cn(
                      'group flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition',
                      isSelected ? 'bg-sky-50/70' : 'bg-white hover:bg-slate-50'
                    )}
                  >
                    <div>
                      <div className="font-medium text-slate-900">{room.name}</div>
                      {room.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">{room.description}</div>
                      )}
                      <div className="mt-1 text-xs text-slate-400">Room ID: {room.roomId}</div>
                    </div>
                    <span
                      className={cn(
                        'mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        isSelected
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700'
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
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {selectedRoomId && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              Chatwork連携: {form.name} (Room ID: {selectedRoomId})
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              placeholder="企業名（必須）"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              required
            />
            <FormSelect
              label="担当者"
              hint="複数選択できます"
              multiple
              value={form.ownerIds}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  ownerIds: Array.from(event.target.selectedOptions, (option) => option.value),
                })
              }
            >
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </FormSelect>
            <div className="relative">
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
            <FormTextarea
              containerClassName="md:col-span-2"
              className="min-h-[88px]"
              placeholder="プロフィールを入力"
              value={form.profile}
              onChange={(event) => onFormChange({ ...form, profile: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600  hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white  hover:bg-sky-700"
            >
              登録
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  )
}

export default CompanyCreateForm
