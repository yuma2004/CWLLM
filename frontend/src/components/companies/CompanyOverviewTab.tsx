import { type Dispatch, type ReactNode, type SetStateAction } from 'react'
import Badge from '../ui/Badge'
import CloseIcon from '../ui/CloseIcon'
import ErrorAlert from '../ui/ErrorAlert'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import FormTextarea from '../ui/FormTextarea'
import StatusBadge from '../ui/StatusBadge'
import type { Company } from '../../types'

type CompanyFormState = {
  tags: string[]
  profile: string
  category: string
  status: string
}

type CompanyOverviewTabProps = {
  company: Company
  canWrite: boolean
  companyForm: CompanyFormState
  setCompanyForm: Dispatch<SetStateAction<CompanyFormState>>
  tagInput: string
  setTagInput: Dispatch<SetStateAction<string>>
  tagOptions: string[]
  mergedCategories: string[]
  mergedStatuses: string[]
  companyError: string
  isEditing: boolean
  isSaving: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  contactsSection: ReactNode
}

function CompanyOverviewTab({
  company,
  canWrite,
  companyForm,
  setCompanyForm,
  tagInput,
  setTagInput,
  tagOptions,
  mergedCategories,
  mergedStatuses,
  companyError,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  contactsSection,
}: CompanyOverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">基本情報</h3>
          {canWrite && !isEditing && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              編集
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">区分</div>
                <FormSelect
                  value={companyForm.category}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="text-sm"
                >
                  <option value="">区分を選択</option>
                  {mergedCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">ステータス</div>
                <FormSelect
                  value={companyForm.status}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="text-sm"
                >
                  <option value="">ステータスを選択</option>
                  {mergedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 block text-xs font-medium text-slate-600">担当者</div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {company.ownerId || '-'}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium text-slate-600">タグ</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {companyForm.tags.length > 0 ? (
                  companyForm.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 shadow-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() =>
                          setCompanyForm((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((item) => item !== tag),
                          }))
                        }
                        className="text-slate-400 hover:text-rose-500"
                        aria-label={`${tag}を削除`}
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">タグがまだありません</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <FormInput
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="タグを追加（Enterで確定）"
                  list="company-tag-options"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const value = tagInput.replace(',', '').trim()
                      if (!value) return
                      setCompanyForm((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value],
                      }))
                      setTagInput('')
                    }
                    if (e.key === 'Escape') {
                      setTagInput('')
                    }
                  }}
                  containerClassName="flex-1"
                  className="rounded-lg py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = tagInput.trim()
                    if (!value) return
                    setCompanyForm((prev) => ({
                      ...prev,
                      tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value],
                    }))
                    setTagInput('')
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  追加
                </button>
              </div>
              <datalist id="company-tag-options">
                {tagOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div>
              <div className="mb-1 block text-xs font-medium text-slate-600">プロフィール</div>
              <FormTextarea
                value={companyForm.profile}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, profile: e.target.value }))
                }
                rows={3}
                className="rounded-lg"
                placeholder="取引概要や特徴を入力"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">区分</dt>
              <dd className="mt-2 font-medium text-slate-900">{company.category || '-'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">ステータス</dt>
              <dd className="mt-2">
                <StatusBadge status={company.status} size="sm" />
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">担当者</dt>
              <dd className="font-medium text-slate-900">{company.ownerId || '-'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">タグ</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {company.tags.length > 0 ? (
                  company.tags.map((tag) => <Badge key={tag} label={tag} />)
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">プロフィール</dt>
              <dd className="mt-2 text-sm text-slate-700">
                {company.profile || 'プロフィールはまだ登録されていません。'}
              </dd>
            </div>
          </dl>
        )}
        {companyError && <ErrorAlert message={companyError} />}
      </div>

      {contactsSection}
    </div>
  )
}

export default CompanyOverviewTab
