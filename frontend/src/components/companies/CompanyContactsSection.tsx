import { type Dispatch, type FormEvent, type SetStateAction } from 'react'
import ErrorAlert from '../ui/ErrorAlert'
import FormInput from '../ui/FormInput'
import FormTextarea from '../ui/FormTextarea'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import { cn } from '../../lib/cn'
import { getAvatarColor, getInitials } from '../../utils/string'
import type { Contact } from '../../types'

type ContactFormState = {
  name: string
  role: string
  email: string
  phone: string
  memo: string
}

type CompanyContactsSectionProps = {
  contacts: Contact[]
  canWrite: boolean
  showContactForm: boolean
  setShowContactForm: Dispatch<SetStateAction<boolean>>
  form: ContactFormState
  setForm: Dispatch<SetStateAction<ContactFormState>>
  contactError: string
  contactActionError: string
  duplicateContactGroups: Contact[][]
  isDedupeWorking: boolean
  isReorderWorking: boolean
  onOpenDedupeConfirm: () => void
  onAddContact: (event: FormEvent) => void
  editingContactId: string | null
  editContactForm: ContactFormState
  setEditContactForm: Dispatch<SetStateAction<ContactFormState>>
  onStartEditContact: (contact: Contact) => void
  onCancelEditContact: () => void
  onSaveContact: () => void
  onRequestDelete: (contact: Contact) => void
  onMoveContact: (index: number, direction: -1 | 1) => void
  onCopy: (value: string) => void
}

function CompanyContactsSection({
  contacts,
  canWrite,
  showContactForm,
  setShowContactForm,
  form,
  setForm,
  contactError,
  contactActionError,
  duplicateContactGroups,
  isDedupeWorking,
  isReorderWorking,
  onOpenDedupeConfirm,
  onAddContact,
  editingContactId,
  editContactForm,
  setEditContactForm,
  onStartEditContact,
  onCancelEditContact,
  onSaveContact,
  onRequestDelete,
  onMoveContact,
  onCopy,
}: CompanyContactsSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">担当者</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {contacts.length}名
          </span>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowContactForm(true)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {canWrite && (
        <Modal
          isOpen={showContactForm}
          onClose={() => setShowContactForm(false)}
          title="担当者を追加"
          className="max-w-lg"
        >
          <form onSubmit={onAddContact} className="space-y-3">
            <FormInput
              label="担当者名（必須）"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例: 山田 太郎"
              required
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <FormInput
                label="役職"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="例: 営業"
              />
              <FormInput
                label="電話番号"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="例: 03-1234-5678"
              />
            </div>
            <FormInput
              label="メールアドレス"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
            {contactError && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {contactError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowContactForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              >
                追加
              </button>
            </div>
          </form>
        </Modal>
      )}

      {contactActionError && <ErrorAlert message={contactActionError} className="mb-3" />}

      {duplicateContactGroups.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">重複している担当者があります</div>
              <div className="text-xs text-amber-700">メールまたは電話番号が一致しています。</div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={onOpenDedupeConfirm}
                disabled={isDedupeWorking}
                className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:bg-amber-300"
              >
                {isDedupeWorking ? '統合中...' : '重複を統合'}
              </button>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {duplicateContactGroups.map((group) => (
              <li key={group[0].id}>{group.map((contact) => contact.name).join(' / ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-2">
        {contacts.length === 0 ? (
          <EmptyState
            className="rounded-lg bg-slate-50 py-8"
            message="担当者が登録されていません"
            description={
              canWrite
                ? '「追加」から担当者情報を登録してください。'
                : '担当者情報は閲覧のみです。'
            }
            action={
              canWrite ? (
                <button
                  type="button"
                  onClick={() => setShowContactForm(true)}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  担当者を追加
                </button>
              ) : null
            }
          />
        ) : (
          contacts.map((contact, index) => {
            const isEditing = editingContactId === contact.id
            return (
              <div
                key={contact.id}
                className="rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                        getAvatarColor(contact.name)
                      )}
                    >
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <FormInput
                            placeholder="担当者名（必須）"
                            value={editContactForm.name}
                            onChange={(e) =>
                              setEditContactForm({ ...editContactForm, name: e.target.value })
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <FormInput
                              placeholder="役職"
                              value={editContactForm.role}
                              onChange={(e) =>
                                setEditContactForm({ ...editContactForm, role: e.target.value })
                              }
                            />
                            <FormInput
                              placeholder="電話番号"
                              value={editContactForm.phone}
                              onChange={(e) =>
                                setEditContactForm({ ...editContactForm, phone: e.target.value })
                              }
                            />
                          </div>
                          <FormInput
                            placeholder="メールアドレス"
                            value={editContactForm.email}
                            onChange={(e) =>
                              setEditContactForm({ ...editContactForm, email: e.target.value })
                            }
                          />
                          <FormTextarea
                            placeholder="メモ"
                            rows={2}
                            value={editContactForm.memo}
                            onChange={(e) =>
                              setEditContactForm({ ...editContactForm, memo: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-900">{contact.name}</div>
                          {contact.role && <div className="text-xs text-slate-500">{contact.role}</div>}
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            {contact.email && (
                              <button
                                type="button"
                                onClick={() => onCopy(contact.email ?? '')}
                                className="text-slate-500 hover:text-sky-600"
                              >
                                {contact.email}
                              </button>
                            )}
                            {contact.phone && (
                              <button
                                type="button"
                                onClick={() => onCopy(contact.phone ?? '')}
                                className="text-slate-500 hover:text-sky-600"
                              >
                                {contact.phone}
                              </button>
                            )}
                          </div>
                          {contact.memo && (
                            <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                              {contact.memo}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onMoveContact(index, -1)}
                            disabled={index === 0 || isReorderWorking}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveContact(index, 1)}
                            disabled={index === contacts.length - 1 || isReorderWorking}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={onSaveContact}
                              className="text-xs font-medium text-sky-600 hover:text-sky-700"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEditContact}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onStartEditContact(contact)}
                              className="text-xs font-medium text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestDelete(contact)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CompanyContactsSection
