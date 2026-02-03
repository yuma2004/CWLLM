export const CACHE_KEYS = {
  companyOptions: 'companies:options',
  messageLabels: (limit: number) => `messages:labels:${limit}`,
  userOptions: 'users:options',
}

export const CACHE_TTLS_MS = {
  companyOptions: 60_000,
  messageLabels: 30_000,
  userOptions: 30_000,
}
