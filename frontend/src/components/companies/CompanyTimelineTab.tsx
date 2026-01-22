import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useMemo,
} from 'react'
import CloseIcon from '../ui/CloseIcon'
import ErrorAlert from '../ui/ErrorAlert'
import FormInput from '../ui/FormInput'
import Pagination from '../ui/Pagination'
import { Skeleton, SkeletonAvatar } from '../ui/Skeleton'
import type { MessageItem, PaginationState } from '../../types'
import { formatDateGroup } from '../../utils/date'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string, keyword: string) => {
  if (!keyword.trim()) return text
  const pattern = new RegExp(`(${escapeRegExp(keyword.trim())})`, 'gi')
  return text.split(pattern).map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-1 text-slate-900">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

const groupMessagesByDate = (messages: MessageItem[]): Map<string, MessageItem[]> => {
  const groups = new Map<string, MessageItem[]>()
  messages.forEach((msg) => {
    const dateKey = formatDateGroup(msg.sentAt)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(msg)
  })
  return groups
}

type CompanyTimelineTabProps = {
  messageFrom: string
  setMessageFrom: Dispatch<SetStateAction<string>>
  messageTo: string
  setMessageTo: Dispatch<SetStateAction<string>>
  messageQuery: string
  setMessageQuery: Dispatch<SetStateAction<string>>
  messageLabel: string
  setMessageLabel: Dispatch<SetStateAction<string>>
  labelOptions: string[]
  messageError: string
  isLoading: boolean
  messages: MessageItem[]
  canWrite: boolean
  onAddLabel: (messageId: string) => void
  onRemoveLabel: (messageId: string, label: string) => void
  labelInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function CompanyTimelineTab({
  messageFrom,
  setMessageFrom,
  messageTo,
  setMessageTo,
  messageQuery,
  setMessageQuery,
  messageLabel,
  setMessageLabel,
  labelOptions,
  messageError,
  isLoading,
  messages,
  canWrite,
  onAddLabel,
  onRemoveLabel,
  labelInputRefs,
  pagination,
  onPageChange,
  onPageSizeChange,
}: CompanyTimelineTabProps) {
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages])

  return (
    <div className="space-y-4">
      {/* Message Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FormInput
          type="date"
          value={messageFrom}
          onChange={(e) => setMessageFrom(e.target.value)}
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
        />
        <span className="text-slate-400">〜</span>
        <FormInput
          type="date"
          value={messageTo}
          onChange={(e) => setMessageTo(e.target.value)}
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
        />
        <FormInput
          placeholder="本文検索"
          value={messageQuery}
          onChange={(e) => setMessageQuery(e.target.value)}
          containerClassName="min-w-[150px] flex-1"
          className="rounded-lg py-1.5 text-sm"
        />
        <FormInput
          placeholder="ラベル"
          value={messageLabel}
          onChange={(e) => setMessageLabel(e.target.value)}
          list="company-message-label-options"
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
        />
      </div>
      <datalist id="company-message-label-options">
        {labelOptions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {messageError && <ErrorAlert message={messageError} />}

      {/* Messages Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <SkeletonAvatar size="sm" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">メッセージがありません</div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedMessages.entries()).map(([dateLabel, msgs]) => (
            <div key={dateLabel}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="relative space-y-3 pl-6">
                <div className="absolute bottom-0 left-2 top-0 w-0.5 bg-slate-200" />
                {msgs.map((message) => (
                  <div key={message.id} className="relative">
                    <div className="absolute -left-4 top-3 h-2 w-2 rounded-full bg-slate-400" />
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900">{message.sender}</span>
                        <span className="text-slate-400">
                          {new Date(message.sentAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {highlightText(message.body, messageQuery)}
                      </p>
                      {message.labels && message.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.labels.map((label) =>
                            canWrite ? (
                              <button
                                key={label}
                                type="button"
                                onClick={() => onRemoveLabel(message.id, label)}
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600 hover:bg-indigo-100"
                              >
                                <span>#{label}</span>
                                <CloseIcon className="h-3 w-3" />
                              </button>
                            ) : (
                              <span
                                key={label}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                              >
                                #{label}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      {canWrite && (
                        <div className="mt-2 flex gap-1">
                          <FormInput
                            noContainer
                            ref={(input) => {
                              labelInputRefs.current[message.id] = input
                            }}
                            placeholder="ラベルを追加"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                onAddLabel(message.id)
                              }
                            }}
                            list="company-message-label-options"
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => onAddLabel(message.id)}
                            className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                          >
                            追加
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination.total > 0 && (
        <div className="mt-6">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  )
}

export default CompanyTimelineTab
