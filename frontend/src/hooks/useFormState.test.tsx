import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFormMessages, useFormState } from './useFormState'

type FormValues = {
  name: string
  memo: string
  subscribed: boolean
}

function FormStateHarness() {
  const form = useFormState<FormValues>({
    name: '',
    memo: '',
    subscribed: false,
  })

  return (
    <div>
      <input
        aria-label="名前"
        value={form.values.name}
        onChange={form.handleChange('name')}
      />
      <textarea
        aria-label="メモ"
        value={form.values.memo}
        onChange={form.handleChange('memo')}
      />
      <input
        type="checkbox"
        aria-label="購読"
        checked={form.values.subscribed}
        onChange={form.handleCheckboxChange('subscribed')}
      />

      <button type="button" onClick={() => form.setField('name', '直接更新')}>
        setField
      </button>
      <button
        type="button"
        onClick={() => form.setFields({ memo: '一括更新', subscribed: true })}
      >
        setFields
      </button>
      <button type="button" onClick={form.reset}>
        reset
      </button>
      <button
        type="button"
        onClick={() =>
          form.resetWith({
            name: '差し替え後',
            memo: '差し替えメモ',
            subscribed: false,
          })
        }
      >
        resetWith
      </button>

      <output aria-label="name値">{form.values.name}</output>
      <output aria-label="memo値">{form.values.memo}</output>
      <output aria-label="subscribed値">{String(form.values.subscribed)}</output>
      <output aria-label="dirty状態">{form.isDirty ? 'true' : 'false'}</output>
    </div>
  )
}

describe('useFormStateフック', () => {
  it('入力ハンドラーと状態操作APIでフォーム値を更新できる', async () => {
    const user = userEvent.setup()
    render(<FormStateHarness />)

    expect(screen.getByLabelText('dirty状態')).toHaveTextContent('false')

    await user.type(screen.getByLabelText('名前'), '山田')
    await user.type(screen.getByLabelText('メモ'), 'テストメモ')
    await user.click(screen.getByLabelText('購読'))

    expect(screen.getByLabelText('name値')).toHaveTextContent('山田')
    expect(screen.getByLabelText('memo値')).toHaveTextContent('テストメモ')
    expect(screen.getByLabelText('subscribed値')).toHaveTextContent('true')
    expect(screen.getByLabelText('dirty状態')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'reset' }))
    expect(screen.getByLabelText('name値')).toHaveTextContent('')
    expect(screen.getByLabelText('memo値')).toHaveTextContent('')
    expect(screen.getByLabelText('subscribed値')).toHaveTextContent('false')
    expect(screen.getByLabelText('dirty状態')).toHaveTextContent('false')

    await user.click(screen.getByRole('button', { name: 'setField' }))
    await user.click(screen.getByRole('button', { name: 'setFields' }))
    expect(screen.getByLabelText('name値')).toHaveTextContent('直接更新')
    expect(screen.getByLabelText('memo値')).toHaveTextContent('一括更新')
    expect(screen.getByLabelText('subscribed値')).toHaveTextContent('true')
    expect(screen.getByLabelText('dirty状態')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'resetWith' }))
    expect(screen.getByLabelText('name値')).toHaveTextContent('差し替え後')
    expect(screen.getByLabelText('memo値')).toHaveTextContent('差し替えメモ')
    expect(screen.getByLabelText('subscribed値')).toHaveTextContent('false')
    expect(screen.getByLabelText('dirty状態')).toHaveTextContent('true')
  })
})

describe('useFormMessagesフック', () => {
  it('エラー・成功メッセージの設定と個別クリアおよび一括クリアができる', () => {
    const { result } = renderHook(() => useFormMessages())

    act(() => {
      result.current.setError('入力エラー')
      result.current.setSuccess('保存成功')
    })
    expect(result.current.error).toBe('入力エラー')
    expect(result.current.success).toBe('保存成功')

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBe('')
    expect(result.current.success).toBe('保存成功')

    act(() => {
      result.current.clearSuccess()
    })
    expect(result.current.error).toBe('')
    expect(result.current.success).toBe('')

    act(() => {
      result.current.setError('再設定エラー')
      result.current.setSuccess('再設定成功')
      result.current.clearMessages()
    })
    expect(result.current.error).toBe('')
    expect(result.current.success).toBe('')
  })
})
