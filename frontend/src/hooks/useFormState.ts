import { useCallback, useState } from 'react'

/**
 * 汎用フォーム状態管理Hook
 *
 * @param initialValues - フォームの初期値
 * @returns フォーム状態と操作関数
 *
 * @example
 * const { values, setField, setValues, reset, isDirty } = useFormState({
 *   name: '',
 *   email: '',
 * })
 *
 * <input
 *   value={values.name}
 *   onChange={(e) => setField('name', e.target.value)}
 * />
 */
export function useFormState<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues)
  const [initialSnapshot] = useState<T>(initialValues)

  /**
   * 単一フィールドを更新
   */
  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  /**
   * 複数フィールドを一度に更新
   */
  const setFields = useCallback((partial: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...partial }))
  }, [])

  /**
   * 初期値にリセット
   */
  const reset = useCallback(() => {
    setValues(initialSnapshot)
  }, [initialSnapshot])

  /**
   * 新しい値でリセット（編集モードで既存データをセットする場合など）
   */
  const resetWith = useCallback((newValues: T) => {
    setValues(newValues)
  }, [])

  /**
   * フォームが変更されたかどうか
   */
  const isDirty = Object.keys(values).some(
    (key) => values[key as keyof T] !== initialSnapshot[key as keyof T]
  )

  /**
   * イベントハンドラー用のヘルパー
   * input/select/textareaのonChangeで使用
   */
  const handleChange = useCallback(
    <K extends keyof T>(key: K) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = event.target
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
        setField(key, value as T[K])
      },
    [setField]
  )

  /**
   * チェックボックス用のハンドラー
   */
  const handleCheckboxChange = useCallback(
    <K extends keyof T>(key: K) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setField(key, event.target.checked as T[K])
      },
    [setField]
  )

  return {
    values,
    setValues,
    setField,
    setFields,
    reset,
    resetWith,
    isDirty,
    handleChange,
    handleCheckboxChange,
  }
}

/**
 * フォーム送信状態管理Hook
 *
 * @example
 * const { error, success, setError, setSuccess, clearMessages } = useFormMessages()
 */
export function useFormMessages() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const clearMessages = useCallback(() => {
    setError('')
    setSuccess('')
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const clearSuccess = useCallback(() => {
    setSuccess('')
  }, [])

  return {
    error,
    success,
    setError,
    setSuccess,
    clearMessages,
    clearError,
    clearSuccess,
  }
}
