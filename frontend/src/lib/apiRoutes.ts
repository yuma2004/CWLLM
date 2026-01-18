const withQuery = (path: string, query?: string) => (query ? `${path}?${query}` : path)

export const apiRoutes = {
  auth: {
    me: () => '/api/auth/me',
    login: () => '/api/auth/login',
    logout: () => '/api/auth/logout',
  },
  dashboard: () => '/api/dashboard',
  companies: {
    base: () => '/api/companies',
    list: (query: string) => withQuery('/api/companies', query),
    options: () => '/api/companies/options',
    detail: (id: string) => `/api/companies/${id}`,
    search: () => '/api/companies/search',
    contacts: (companyId: string) => `/api/companies/${companyId}/contacts`,
    contactsReorder: (companyId: string) => `/api/companies/${companyId}/contacts/reorder`,
    tasks: (companyId: string, query?: string) =>
      withQuery(`/api/companies/${companyId}/tasks`, query),
    chatworkRooms: (companyId: string) => `/api/companies/${companyId}/chatwork-rooms`,
    chatworkRoom: (companyId: string, roomId: string) =>
      `/api/companies/${companyId}/chatwork-rooms/${roomId}`,
    messages: (companyId: string, query: string) =>
      withQuery(`/api/companies/${companyId}/messages`, query),
  },
  contacts: {
    base: () => '/api/contacts',
    detail: (id: string) => `/api/contacts/${id}`,
  },
  messages: {
    base: () => '/api/messages',
    search: (query: string) => withQuery('/api/messages/search', query),
    labels: (limit = 20) => `/api/messages/labels?limit=${limit}`,
    messageLabels: (messageId: string) => `/api/messages/${messageId}/labels`,
    messageLabel: (messageId: string, label: string) =>
      `/api/messages/${messageId}/labels/${encodeURIComponent(label)}`,
  },
  chatwork: {
    rooms: () => '/api/chatwork/rooms',
    room: (roomId: string) => `/api/chatwork/rooms/${roomId}`,
    roomsSync: () => '/api/chatwork/rooms/sync',
    messagesSync: () => '/api/chatwork/messages/sync',
  },
  tasks: {
    list: (query: string) => withQuery('/api/tasks', query),
    myList: (query: string) => withQuery('/api/me/tasks', query),
    base: () => '/api/tasks',
    detail: (id: string) => `/api/tasks/${id}`,
    bulk: () => '/api/tasks/bulk',
  },
  users: {
    list: () => '/api/users',
    options: () => '/api/users/options',
    create: () => '/api/users',
  },
  projects: {
    list: (query: string) => withQuery('/api/projects', query),
    base: () => '/api/projects',
    detail: (id: string) => `/api/projects/${id}`,
    search: () => '/api/projects/search',
    wholesales: (projectId: string) => `/api/projects/${projectId}/wholesales`,
  },
  wholesales: {
    list: (query: string) => withQuery('/api/wholesales', query),
    base: () => '/api/wholesales',
    detail: (id: string) => `/api/wholesales/${id}`,
    tasks: (id: string, query: string) => withQuery(`/api/wholesales/${id}/tasks`, query),
  },
  settings: () => '/api/settings',
  exports: {
    companies: () => '/api/export/companies.csv',
    tasks: () => '/api/export/tasks.csv',
  },
  jobs: {
    base: () => '/api/jobs',
    detail: (id: string) => `/api/jobs/${id}`,
    cancel: (id: string) => `/api/jobs/${id}/cancel`,
  },
}
