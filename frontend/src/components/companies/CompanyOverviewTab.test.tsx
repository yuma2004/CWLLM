import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import CompanyOverviewTab from './CompanyOverviewTab'
import type { Company } from '../../types'

type CompanyFormState = {
  tags: string[]
  profile: string
  category: string
  status: string
  ownerIds: string[]
}

const company: Company = {
  id: 'company-1',
  name: 'Acme',
  category: '商社',
  status: '進行中',
  tags: ['既存タグ'],
  ownerIds: ['user-1', 'unknown-owner'],
  profile: '',
}

const users = [
  { id: 'user-1', email: 'owner1@example.com', name: '担当A' },
  { id: 'user-2', email: 'owner2@example.com', name: '担当B' },
]

function CompanyOverviewHarness({
  canWrite = true,
  companyError = '',
}: {
  canWrite?: boolean
  companyError?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saveCount, setSaveCount] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [companyForm, setCompanyForm] = useState<CompanyFormState>({
    tags: ['既存タグ'],
    profile: '',
    category: '商社',
    status: '進行中',
    ownerIds: ['user-1'],
  })

  return (
    <>
      <CompanyOverviewTab
        company={company}
        canWrite={canWrite}
        companyForm={companyForm}
        setCompanyForm={setCompanyForm}
        tagInput={tagInput}
        setTagInput={setTagInput}
        tagOptions={['既存タグ', 'VIP']}
        mergedCategories={['商社', '広告代理店']}
        mergedStatuses={['進行中', '保留']}
        userOptions={users}
        companyError={companyError}
        isEditing={isEditing}
        isSaving={false}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onSave={() => setSaveCount((count) => count + 1)}
        contactsSection={<div>連絡先セクション</div>}
      />
      <output aria-label="現在カテゴリ">{companyForm.category}</output>
      <output aria-label="現在ステータス">{companyForm.status}</output>
      <output aria-label="現在担当者">{companyForm.ownerIds.join(',')}</output>
      <output aria-label="現在タグ">{companyForm.tags.join(',')}</output>
      <output aria-label="現在プロフィール">{companyForm.profile}</output>
      <output aria-label="タグ入力値">{tagInput}</output>
      <output aria-label="保存回数">{String(saveCount)}</output>
    </>
  )
}

describe('企業詳細の概要タブ', () => {
  it('表示モードで担当者表示・タグ・プロフィール・エラーを表示する', () => {
    render(<CompanyOverviewHarness canWrite={false} companyError="更新エラー" />)

    expect(screen.getByText('担当A / unknown-owner')).toBeInTheDocument()
    expect(screen.getAllByText('既存タグ').length).toBeGreaterThan(0)
    expect(screen.getByText('プロフィールはまだ登録されていません。')).toBeInTheDocument()
    expect(screen.getByText('連絡先セクション')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('更新エラー')
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument()
  })

  it('編集モードでカテゴリ・担当者・タグ・プロフィールを更新できる', async () => {
    const user = userEvent.setup()
    render(<CompanyOverviewHarness />)

    await user.click(screen.getByRole('button', { name: '編集' }))

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], '広告代理店')
    await user.selectOptions(selects[1], '保留')
    await user.selectOptions(screen.getByRole('listbox'), ['user-1', 'user-2'])
    expect(screen.getByLabelText('現在カテゴリ')).toHaveTextContent('広告代理店')
    expect(screen.getByLabelText('現在ステータス')).toHaveTextContent('保留')
    expect(screen.getByLabelText('現在担当者')).toHaveTextContent('user-1,user-2')

    const tagInput = screen.getByPlaceholderText('タグを追加（Enterで確定）')
    await user.type(tagInput, '新タグ')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByLabelText('現在タグ')).toHaveTextContent('既存タグ,新タグ')
    expect(screen.getAllByLabelText('新タグを削除').length).toBe(1)

    await user.type(tagInput, 'Enterタグ')
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('現在タグ')).toHaveTextContent('既存タグ,新タグ,Enterタグ')

    await user.click(screen.getByLabelText('新タグを削除'))
    expect(screen.getByLabelText('現在タグ')).toHaveTextContent('既存タグ,Enterタグ')

    await user.type(tagInput, 'キャンセル入力')
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('タグ入力値')).toHaveTextContent('')

    await user.type(screen.getByPlaceholderText('取引概要や特徴を入力'), '新しいプロフィール')
    expect(screen.getByLabelText('現在プロフィール')).toHaveTextContent('新しいプロフィール')

    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByLabelText('保存回数')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
  })
})
