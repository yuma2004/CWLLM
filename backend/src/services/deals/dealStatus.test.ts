import { describe, expect, it } from 'vitest'
import { canTransitionDealStatus, dealStatusLabel } from './dealStatus'

describe('canTransitionDealStatus', () => {
  it('accepts valid transitions', () => {
    expect(canTransitionDealStatus('pre_contact', 'contacting')).toBe(true)
    expect(canTransitionDealStatus('contacting', 'negotiating')).toBe(true)
    expect(canTransitionDealStatus('negotiating', 'agreed')).toBe(true)
    expect(canTransitionDealStatus('agreed', 'preparing_publish')).toBe(true)
    expect(canTransitionDealStatus('preparing_publish', 'publishing')).toBe(true)
    expect(canTransitionDealStatus('publishing', 'stopped')).toBe(true)
    expect(canTransitionDealStatus('negotiating', 'stopped')).toBe(true)
    expect(canTransitionDealStatus('pre_contact', 'dropped')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransitionDealStatus('pre_contact', 'publishing')).toBe(false)
    expect(canTransitionDealStatus('contacting', 'agreed')).toBe(false)
    expect(canTransitionDealStatus('stopped', 'contacting')).toBe(false)
    expect(canTransitionDealStatus('dropped', 'contacting')).toBe(false)
  })

  it('allows no-op transitions', () => {
    expect(canTransitionDealStatus('negotiating', 'negotiating')).toBe(true)
  })
})

describe('dealStatusLabel', () => {
  it('returns expected labels', () => {
    expect(dealStatusLabel('pre_contact')).toBe('打診前')
    expect(dealStatusLabel('contacting')).toBe('打診中')
    expect(dealStatusLabel('negotiating')).toBe('交渉中')
    expect(dealStatusLabel('agreed')).toBe('合意')
    expect(dealStatusLabel('preparing_publish')).toBe('掲載準備中')
    expect(dealStatusLabel('publishing')).toBe('掲載中')
    expect(dealStatusLabel('stopped')).toBe('停止・終了')
    expect(dealStatusLabel('dropped')).toBe('見送り')
  })
})
