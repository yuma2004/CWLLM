import { useMemo, useState, type FormEvent } from 'react'
import { apiRoutes } from '../lib/apiRoutes'
import { useFetch, useMutation } from './useApi'
import type { Contact } from '../types'
import type { ToastState } from './useToast'
import { toErrorMessage } from '../utils/errorState'

export type UseCompanyContactsOptions = {
  companyId?: string
  networkErrorMessage: string
  showToast: (message: string, variant: ToastState['variant']) => void
  messages: {
    requiredName: string
    updateFailed: string
    updateSuccess: string
    deleteFailed: string
    deleteSuccess: string
    reorderFailed: string
    mergeSuccess: string
    mergeFailed: string
  }
}

export const useCompanyContacts = ({
  companyId,
  networkErrorMessage,
  showToast,
  messages,
}: UseCompanyContactsOptions) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactError, setContactError] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    memo: '',
  })
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editContactForm, setEditContactForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    memo: '',
  })
  const [contactActionError, setContactActionError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDedupeConfirmOpen, setIsDedupeConfirmOpen] = useState(false)
  const [isDedupeWorking, setIsDedupeWorking] = useState(false)

  const {
    error: contactsFetchError,
    isLoading: isLoadingContacts,
    refetch: refetchContacts,
  } = useFetch<{ contacts: Contact[] }>(
    companyId ? apiRoutes.companies.contacts(companyId) : null,
    {
      enabled: Boolean(companyId),
      errorMessage: networkErrorMessage,
      authMode: 'bearer',
      onSuccess: (data) => setContacts(data.contacts ?? []),
    }
  )

  const duplicateContactGroups = useMemo(() => {
    const groups = new Map<string, Contact[]>()
    contacts.forEach((contact) => {
      const emailKey = contact.email?.trim().toLowerCase()
      const phoneKey = contact.phone?.trim()
      const key = emailKey || phoneKey
      if (!key) return
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(contact)
    })
    return Array.from(groups.values()).filter((group) => group.length > 1)
  }, [contacts])

  const { mutate: addContact } = useMutation<
    { contact: Contact },
    { name: string; role?: string; email?: string; phone?: string; memo?: string }
  >(companyId ? apiRoutes.companies.contacts(companyId) : '', 'POST')

  const { mutate: updateContact } = useMutation<
    { contact: Contact },
    {
      name?: string
      role?: string | null
      email?: string | null
      phone?: string | null
      memo?: string | null
      sortOrder?: number | null
    }
  >(apiRoutes.contacts.base(), 'PATCH')

  const { mutate: deleteContact, isLoading: isDeletingContact } = useMutation<unknown, void>(
    apiRoutes.contacts.base(),
    'DELETE'
  )

  const { mutate: reorderContactsMutation, isLoading: isReorderWorking } = useMutation<
    unknown,
    { orderedIds: string[] }
  >(companyId ? apiRoutes.companies.contactsReorder(companyId) : '', 'PATCH')

  const handleAddContact = async (event: FormEvent) => {
    event.preventDefault()
    setContactError('')
    if (!form.name.trim()) {
      setContactError(messages.requiredName)
      return
    }
    if (!companyId) return

    try {
      await addContact(
        {
          name: form.name,
          role: form.role || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          memo: form.memo || undefined,
        },
        { errorMessage: networkErrorMessage, authMode: 'bearer' }
      )

      setForm({ name: '', role: '', email: '', phone: '', memo: '' })
      setShowContactForm(false)
      void refetchContacts(undefined, { ignoreCache: true })
    } catch (err) {
      setContactError(toErrorMessage(err, networkErrorMessage))
    }
  }

  const resetEditContactForm = () => {
    setEditContactForm({ name: '', role: '', email: '', phone: '', memo: '' })
  }

  const startEditContact = (contact: Contact) => {
    setContactActionError('')
    setEditingContactId(contact.id)
    setEditContactForm({
      name: contact.name,
      role: contact.role ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      memo: contact.memo ?? '',
    })
  }

  const cancelEditContact = () => {
    setEditingContactId(null)
    resetEditContactForm()
    setContactActionError('')
  }

  const handleSaveContact = async () => {
    if (!editingContactId) return
    const name = editContactForm.name.trim()
    if (!name) {
      setContactActionError(messages.requiredName)
      return
    }
    setContactActionError('')
    try {
      const data = await updateContact(
        {
          name,
          role: editContactForm.role.trim() || null,
          email: editContactForm.email.trim() || null,
          phone: editContactForm.phone.trim() || null,
          memo: editContactForm.memo.trim() || null,
        },
        {
          url: apiRoutes.contacts.detail(editingContactId),
          errorMessage: messages.updateFailed,
          authMode: 'bearer',
        }
      )
      if (data?.contact) {
        const contact = data.contact
        setContacts((prev) =>
          prev.map((item) => (item.id === contact.id ? { ...item, ...contact } : item))
        )
      } else {
        void refetchContacts(undefined, { ignoreCache: true })
      }
      showToast(messages.updateSuccess, 'success')
      setEditingContactId(null)
      resetEditContactForm()
    } catch (err) {
      setContactActionError(
        err instanceof Error ? err.message : messages.updateFailed
      )
    }
  }

  const handleConfirmDeleteContact = async () => {
    if (!confirmDelete) return
    setContactActionError('')
    try {
      await deleteContact(undefined, {
        url: apiRoutes.contacts.detail(confirmDelete.id),
        errorMessage: messages.deleteFailed,
        authMode: 'bearer',
      })
      setContacts((prev) => prev.filter((contact) => contact.id !== confirmDelete.id))
      if (editingContactId === confirmDelete.id) {
        setEditingContactId(null)
        resetEditContactForm()
      }
      showToast(messages.deleteSuccess, 'success')
      setConfirmDelete(null)
    } catch (err) {
      setContactActionError(
        err instanceof Error ? err.message : messages.deleteFailed
      )
    }
  }

  const reorderContacts = async (nextContacts: Contact[]) => {
    if (!companyId) return
    setContactActionError('')
    const previous = contacts
    const orderedContacts = nextContacts.map((contact, index) => ({
      ...contact,
      sortOrder: index + 1,
    }))
    setContacts(orderedContacts)
    try {
      await reorderContactsMutation(
        { orderedIds: orderedContacts.map((contact) => contact.id) },
        { errorMessage: messages.reorderFailed, authMode: 'bearer' }
      )
    } catch (err) {
      setContacts(previous)
      setContactActionError(
        err instanceof Error ? err.message : messages.reorderFailed
      )
    }
  }

  const moveContact = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= contacts.length) return
    const nextContacts = [...contacts]
    const [moved] = nextContacts.splice(index, 1)
    nextContacts.splice(nextIndex, 0, moved)
    void reorderContacts(nextContacts)
  }

  const contactScore = (contact: Contact) =>
    [contact.name, contact.role, contact.email, contact.phone, contact.memo].filter(
      (value) => value && value.trim()
    ).length

  const pickContactValue = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      const trimmed = value?.trim()
      if (trimmed) return trimmed
    }
    return ''
  }

  const handleMergeDuplicates = async () => {
    if (duplicateContactGroups.length === 0) {
      setIsDedupeConfirmOpen(false)
      return
    }
    setIsDedupeWorking(true)
    setContactActionError('')
    try {
      let nextContacts = [...contacts]
      for (const group of duplicateContactGroups) {
        const sortedGroup = [...group].sort((a, b) => contactScore(b) - contactScore(a))
        const primary = sortedGroup[0]
        const merged = {
          name: pickContactValue(primary.name, ...sortedGroup.map((contact) => contact.name)),
          role: pickContactValue(primary.role, ...sortedGroup.map((contact) => contact.role)),
          email: pickContactValue(primary.email, ...sortedGroup.map((contact) => contact.email)),
          phone: pickContactValue(primary.phone, ...sortedGroup.map((contact) => contact.phone)),
          memo: pickContactValue(primary.memo, ...sortedGroup.map((contact) => contact.memo)),
        }
        const normalize = (value?: string | null) => value?.trim() || ''
        const needsUpdate =
          normalize(primary.name) !== merged.name ||
          normalize(primary.role) !== merged.role ||
          normalize(primary.email) !== merged.email ||
          normalize(primary.phone) !== merged.phone ||
          normalize(primary.memo) !== merged.memo

        let updatedPrimary = primary
        if (needsUpdate) {
          const data = await updateContact(
            {
              name: merged.name,
              role: merged.role || null,
              email: merged.email || null,
              phone: merged.phone || null,
              memo: merged.memo || null,
            },
            {
              url: apiRoutes.contacts.detail(primary.id),
              errorMessage: messages.updateFailed,
              authMode: 'bearer',
            }
          )
          if (data?.contact) {
            updatedPrimary = data.contact
          }
        }

        nextContacts = nextContacts.map((contact) =>
          contact.id === updatedPrimary.id ? { ...contact, ...updatedPrimary } : contact
        )

        const duplicateContacts = group.filter((contact) => contact.id !== primary.id)
        for (const duplicate of duplicateContacts) {
          await deleteContact(undefined, {
            url: apiRoutes.contacts.detail(duplicate.id),
            errorMessage: messages.deleteFailed,
            authMode: 'bearer',
          })
        }
        if (duplicateContacts.length > 0) {
          const duplicateIds = new Set(duplicateContacts.map((contact) => contact.id))
          if (editingContactId && duplicateIds.has(editingContactId)) {
            setEditingContactId(null)
            resetEditContactForm()
          }
          nextContacts = nextContacts.filter((contact) => !duplicateIds.has(contact.id))
        }
      }

      setContacts(nextContacts)
      showToast(messages.mergeSuccess, 'success')
    } catch (err) {
      setContactActionError(
        err instanceof Error ? err.message : messages.mergeFailed
      )
    } finally {
      setIsDedupeWorking(false)
      setIsDedupeConfirmOpen(false)
    }
  }

  return {
    contacts,
    setContacts,
    contactError,
    setContactError,
    showContactForm,
    setShowContactForm,
    form,
    setForm,
    editingContactId,
    setEditingContactId,
    editContactForm,
    setEditContactForm,
    contactActionError,
    setContactActionError,
    confirmDelete,
    setConfirmDelete,
    isDedupeConfirmOpen,
    setIsDedupeConfirmOpen,
    isDedupeWorking,
    isReorderWorking,
    isDeletingContact,
    duplicateContactGroups,
    contactsFetchError,
    isLoadingContacts,
    refetchContacts,
    handleAddContact,
    startEditContact,
    cancelEditContact,
    handleSaveContact,
    handleConfirmDeleteContact,
    reorderContacts,
    moveContact,
    handleMergeDuplicates,
    resetEditContactForm,
  }
}

