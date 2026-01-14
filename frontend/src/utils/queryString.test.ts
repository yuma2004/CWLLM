import { buildQueryString } from './queryString'

describe('buildQueryString', () => {
  it('skips empty and nullish values', () => {
    const query = buildQueryString({
      q: '',
      status: 'active',
      ownerId: undefined,
      category: null,
      page: 1,
      pageSize: 20,
    })

    expect(query).toBe('status=active&page=1&pageSize=20')
  })

  it('stringifies non-string values', () => {
    const query = buildQueryString({
      page: 2,
      pageSize: 50,
      archived: false,
    })

    expect(query).toBe('page=2&pageSize=50&archived=false')
  })
})
