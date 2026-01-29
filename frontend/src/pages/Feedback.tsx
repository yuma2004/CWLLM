import { useMemo, useState } from 'react'
import ErrorAlert from '../components/ui/ErrorAlert'
import SuccessAlert from '../components/ui/SuccessAlert'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { apiRoutes } from '../lib/apiRoutes'
import { toErrorMessage } from '../utils/errorState'

type FeedbackPayload = {
  type: 'bug' | 'improvement' | 'other'
  title?: string
  message: string
  pageUrl?: string
}

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'bug', label: '不具合報告' },
  { value: 'improvement', label: '改善提案' },
  { value: 'other', label: 'その他' },
] as const

type FeedbackItem = {
  id: string
  userId: string
  type: FeedbackPayload['type']
  title?: string | null
  message: string
  pageUrl?: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name?: string | null
  }
}

function Feedback() {
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'bug' as FeedbackPayload['type'],
    title: '',
    message: '',
  })
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', message: '' })
  const { mutate: submitFeedback, isLoading: isFeedbackSending } = useMutation<
    { feedback: { id: string } },
    FeedbackPayload
  >(apiRoutes.feedback.base(), 'POST')
  const { mutate: updateFeedback, isLoading: isUpdating } = useMutation<
    { feedback: FeedbackItem },
    { title?: string; message?: string }
  >(apiRoutes.feedback.base(), 'PATCH')

  const {
    data: improvementData,
    setData: setImprovementData,
    error: improvementError,
    setError: setImprovementError,
    isLoading: isImprovementLoading,
    refetch: refetchImprovements,
  } = useFetch<{ feedbacks: FeedbackItem[] }>(apiRoutes.feedback.list('type=improvement'), {
    authMode: 'bearer',
    errorMessage: '改善案の取得に失敗しました',
  })

  const improvements = useMemo(() => improvementData?.feedbacks ?? [], [improvementData])

  const canEdit = (feedback: FeedbackItem) => isAdmin || feedback.userId === user?.id

  const handleFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFeedbackError('')
    setFeedbackSuccess('')

    if (!feedbackForm.message.trim()) {
      setFeedbackError('内容を入力してください')
      return
    }

    try {
      const pageUrl = typeof window === 'undefined' ? undefined : window.location.href
      await submitFeedback(
        {
          type: feedbackForm.type,
          title: feedbackForm.title.trim() || undefined,
          message: feedbackForm.message.trim(),
          pageUrl,
        },
        { errorMessage: 'フィードバックの送信に失敗しました' }
      )
      setFeedbackSuccess('フィードバックを送信しました。ありがとうございます。')
      setFeedbackForm((prev) => ({ ...prev, title: '', message: '' }))
      if (feedbackForm.type === 'improvement') {
        void refetchImprovements(undefined, { ignoreCache: true })
      }
    } catch (err) {
      setFeedbackError(toErrorMessage(err, 'フィードバックの送信に失敗しました'))
    }
  }

  const startEditing = (feedback: FeedbackItem) => {
    setUpdateError('')
    setUpdateSuccess('')
    setEditingId(feedback.id)
    setEditForm({
      title: feedback.title ?? '',
      message: feedback.message ?? '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ title: '', message: '' })
  }

  const handleUpdate = async (feedbackId: string) => {
    setUpdateError('')
    setUpdateSuccess('')
    if (!editForm.message.trim()) {
      setUpdateError('内容を入力してください')
      return
    }

    try {
      const response = await updateFeedback(
        {
          title: editForm.title.trim(),
          message: editForm.message.trim(),
        },
        { url: apiRoutes.feedback.detail(feedbackId), errorMessage: '更新に失敗しました' }
      )
      if (response?.feedback) {
        setImprovementData((prev) => {
          if (!prev) return prev
          return {
            feedbacks: prev.feedbacks.map((item) =>
              item.id === feedbackId ? response.feedback : item
            ),
          }
        })
      }
      setUpdateSuccess('改善案を更新しました。')
      setEditingId(null)
    } catch (err) {
      setUpdateError(toErrorMessage(err, '更新に失敗しました'))
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-balance text-2xl font-bold text-slate-900">不具合フィードバック</h2>
        <p className="text-pretty text-sm text-slate-500 mt-1">
          不具合の再現手順や発生状況をお知らせください。改善提案もこちらで受け付けます。
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <FormSelect
            label="種別"
            value={feedbackForm.type}
            onChange={(event) =>
              setFeedbackForm((prev) => ({
                ...prev,
                type: event.target.value as FeedbackPayload['type'],
              }))
            }
            disabled={isFeedbackSending}
          >
            {FEEDBACK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="タイトル（任意）"
            value={feedbackForm.title}
            onChange={(event) => setFeedbackForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="例: タスク一覧で並び替えが反映されない"
            disabled={isFeedbackSending}
          />
          <FormTextarea
            label="内容"
            value={feedbackForm.message}
            onChange={(event) => setFeedbackForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="いつ・どこで・どの操作で・何が起きたかをご記入ください"
            rows={8}
            disabled={isFeedbackSending}
            required
          />
          {feedbackError && <ErrorAlert message={feedbackError} onClose={() => setFeedbackError('')} />}
          {feedbackSuccess && (
            <SuccessAlert message={feedbackSuccess} onClose={() => setFeedbackSuccess('')} />
          )}
          <div className="flex justify-end">
            <Button type="submit" isLoading={isFeedbackSending} loadingLabel="送信中...">
              送信する
            </Button>
          </div>
        </form>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">改善案一覧</h3>
          <p className="text-xs text-slate-500 mt-1">メンバー全員が閲覧できます。</p>
        </div>

        {improvementError && (
          <ErrorAlert message={improvementError} onClose={() => setImprovementError('')} />
        )}
        {updateError && <ErrorAlert message={updateError} onClose={() => setUpdateError('')} />}
        {updateSuccess && (
          <SuccessAlert message={updateSuccess} onClose={() => setUpdateSuccess('')} />
        )}

        <div className="space-y-3">
          {isImprovementLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 rounded-xl border border-slate-200 bg-slate-50/70" />
              ))}
            </div>
          ) : improvements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
              まだ改善案はありません。
            </div>
          ) : (
            improvements.map((item) => {
              const authorLabel = item.user?.name || item.user?.email || '不明なユーザー'
              const updatedLabel = item.updatedAt
                ? new Date(item.updatedAt).toLocaleString()
                : '-'
              const isEditing = editingId === item.id
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      {isEditing ? (
                        <>
                          <FormInput
                            label="タイトル（任意）"
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, title: event.target.value }))
                            }
                            placeholder="例: タスク一覧の検索が使いづらい"
                            disabled={isUpdating}
                          />
                          <FormTextarea
                            label="内容"
                            value={editForm.message}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, message: event.target.value }))
                            }
                            rows={5}
                            disabled={isUpdating}
                            required
                          />
                        </>
                      ) : (
                        <>
                          <div className="text-base font-semibold text-slate-900">
                            {item.title?.trim().length ? item.title : '（タイトル未設定）'}
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {item.message}
                          </p>
                        </>
                      )}
                    </div>
                    {canEdit(item) && (
                      <div className="flex shrink-0 items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              isLoading={isUpdating}
                              loadingLabel="更新中..."
                              onClick={() => handleUpdate(item.id)}
                            >
                              保存する
                            </Button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                              onClick={cancelEditing}
                              disabled={isUpdating}
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                            onClick={() => startEditing(item)}
                          >
                            編集する
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{authorLabel}</span>
                    <span aria-hidden="true">•</span>
                    <span>更新: {updatedLabel}</span>
                    {item.pageUrl && (
                      <>
                        <span aria-hidden="true">•</span>
                        <a
                          href={item.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-700"
                        >
                          参照ページ
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export default Feedback
