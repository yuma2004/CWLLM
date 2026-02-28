import { buildQueryString } from './queryString'

describe('buildQueryString関数', () => {
  it('空文字とnullish値を除外してクエリを組み立てる', () => {
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

  it('文字列以外の値を文字列化してクエリを組み立てる', () => {
    const query = buildQueryString({
      page: 2,
      pageSize: 50,
      archived: false,
    })

    expect(query).toBe('page=2&pageSize=50&archived=false')
  })
})
