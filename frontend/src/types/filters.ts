export type CompaniesFilters = {
  q: string
  category: string
  status: string
  tag: string
  ownerId: string
}

export type TasksFilters = {
  status: string
  targetType: string
  dueFrom: string
  dueTo: string
  assigneeId: string
}

export type WholesalesFilters = {
  status: string
  projectId: string
  companyId: string
  unitPriceMin: string
  unitPriceMax: string
}

export type ProjectsFilters = {
  q: string
  status: string
  companyId: string
  ownerId: string
}

export type ExportCompanyFilters = {
  from: string
  to: string
  status: string
  category: string
  tag: string
  ownerId: string
}

export type ExportTaskFilters = {
  dueFrom: string
  dueTo: string
  status: string
  targetType: string
  assigneeId: string
}
