import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useMemo,
} from 'react'
import CloseIcon from '../ui/CloseIcon'
import ErrorAlert from '../ui/ErrorAlert'
import FormInput from '../ui/FormInput'
import DateInput from '../ui/DateInput'
import Pagination from '../ui/Pagination'
import { Skeleton, SkeletonAvatar } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import type { MessageItem, PaginationState } from '../../types'
import { formatDateGroup } from '../../utils/date'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string, keyword: string, pattern: RegExp | null) => {
  if (!keyword.trim() || !pattern) return text
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

type ChatworkBlock = {
  type: 'text' | 'info' | 'code' | 'quote'
  content: string
  title?: string
}

const parseChatworkBlocks = (body: string): ChatworkBlock[] => {
  const blocks: ChatworkBlock[] = []
  const blockPattern = /\[(info|code|quote)\]([\s\S]*?)\[\/\1\]/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = blockPattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: body.slice(lastIndex, match.index) })
    }
    const type = match[1].toLowerCase() as ChatworkBlock['type']
    const rawContent = match[2].trim()
    if (type === 'info') {
      const titleMatch = rawContent.match(/\[title\]([\s\S]*?)\[\/title\]/i)
      const title = titleMatch ? titleMatch[1].trim() : undefined
      const content = titleMatch ? rawContent.replace(titleMatch[0], '').trim() : rawContent
      blocks.push({ type: 'info', content, title })
    } else {
      blocks.push({ type, content: rawContent })
    }
    lastIndex = blockPattern.lastIndex
  }

  if (lastIndex < body.length) {
    blocks.push({ type: 'text', content: body.slice(lastIndex) })
  }

  return blocks.filter((block) => block.content.length > 0)
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
  const keyword = messageQuery.trim()
  const highlightPattern = useMemo(
    () => (keyword ? new RegExp(`(${escapeRegExp(keyword)})`, 'gi') : null),
    [keyword]
  )
  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    )
  }, [messages])
  const groupedMessages = useMemo(() => groupMessagesByDate(sortedMessages), [sortedMessages])
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    []
  )

  const renderMessageBody = (body: string) => {
    const blocks = parseChatworkBlocks(body)
    return blocks.map((block, index) => {
      if (block.type === 'code') {
        return (
          <pre
            key={`code-${index}`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 overflow-x-auto"
          >
            <code className="font-mono">{block.content}</code>
          </pre>
        )
      }
      if (block.type === 'info') {
        return (
          <div
            key={`info-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          >
            {block.title && (
              <div className="mb-1 text-[11px] font-semibold text-slate-700">{block.title}</div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {highlightText(block.content, keyword, highlightPattern)}
            </div>
          </div>
        )
      }
      if (block.type === 'quote') {
        return (
          <blockquote
            key={`quote-${index}`}
            className="border-l-2 border-slate-200 pl-3 text-xs text-slate-600 whitespace-pre-wrap break-words"
          >
            {highlightText(block.content, keyword, highlightPattern)}
          </blockquote>
        )
      }
      return (
        <p key={`text-${index}`} className="whitespace-pre-wrap break-words text-sm text-slate-700">
          {highlightText(block.content, keyword, highlightPattern)}
        </p>
      )
    })
  }

  const handleClearFilters = () => {
    setMessageFrom('')
    setMessageTo('')
    setMessageQuery('')
    setMessageLabel('')
  }

  const hasActiveFilter =
    Boolean(messageFrom) || Boolean(messageTo) || Boolean(messageLabel.trim()) || Boolean(keyword)

  return (
    <div className="space-y-4">
      {/* Message Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <DateInput
          value={messageFrom}
          onChange={(e) => setMessageFrom(e.target.value)}
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
          placeholder="開始日"
          aria-label="開始日"
          name="messageFrom"
          autoComplete="off"
        />
        <span className="text-slate-400">〜</span>
        <DateInput
          value={messageTo}
          onChange={(e) => setMessageTo(e.target.value)}
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
          placeholder="終了日"
          aria-label="終了日"
          name="messageTo"
          autoComplete="off"
        />
        <FormInput
          placeholder="本文検索"
          value={messageQuery}
          onChange={(e) => setMessageQuery(e.target.value)}
          containerClassName="min-w-[150px] flex-1"
          className="rounded-lg py-1.5 text-sm"
          name="messageQuery"
          autoComplete="off"
        />
        <FormInput
          placeholder="ラベル"
          value={messageLabel}
          onChange={(e) => setMessageLabel(e.target.value)}
          list="company-message-label-options"
          containerClassName="w-auto"
          className="w-auto rounded-lg py-1.5 text-sm"
          name="messageLabel"
          autoComplete="off"
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
        <div className="py-12">
          <EmptyState
            message="メッセージがありません"
            description={
              hasActiveFilter
                ? '検索条件や期間を見直してください。'
                : 'まだメッセージが同期されていません。'
            }
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  フィルターをクリア
                </button>
              ) : null
            }
          />
        </div>
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
                    <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-900">{message.sender}</span>
                        <time
                          dateTime={message.sentAt}
                          title={new Date(message.sentAt).toLocaleString()}
                        >
                          {timeFormatter.format(new Date(message.sentAt))}
                        </time>
                      </div>
                      <div className="mt-2 space-y-2 text-sm text-slate-700">
                        {renderMessageBody(message.body)}
                      </div>
                      {message.labels && message.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.labels.map((label) =>
                            canWrite ? (
                              <button
                                key={label}
                                type="button"
                                onClick={() => onRemoveLabel(message.id, label)}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200"
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
                            className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-300"
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
