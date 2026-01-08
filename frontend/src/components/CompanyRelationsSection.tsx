import { Link } from 'react-router-dom'
import ErrorAlert from './ui/ErrorAlert'
import StatusBadge from './ui/StatusBadge'
import { formatDate } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { useFetch } from '../hooks/useApi'
import { Project, Wholesale } from '../types'

function CompanyRelationsSection({ companyId }: { companyId: string }) {
  const { data: projectsData, error: projectsError } = useFetch<{ projects: Project[] }>(
    `/api/companies/${companyId}/projects`,
    {
      cacheTimeMs: 10_000,
    }
  )

  const { data: wholesalesData, error: wholesalesError } = useFetch<{
    wholesales: Wholesale[]
  }>(`/api/companies/${companyId}/wholesales`, {
    cacheTimeMs: 10_000,
  })

  const projects = projectsData?.projects ?? []
  const wholesales = wholesalesData?.wholesales ?? []
  const errorMessage = projectsError || wholesalesError

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">案件と卸</h3>
      </div>

      {errorMessage && <ErrorAlert message={errorMessage} className="mt-3" />}

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* この企業の案件 */}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">この企業の案件</div>
          <div className="mt-3 space-y-2">
            {projects.length === 0 ? (
              <div className="text-sm text-slate-500">案件がありません</div>
            ) : (
              projects.map((project) => {
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{project.name}</div>
                      <div className="mt-1">
                        <StatusBadge status={project.status ?? '-'} kind="project" size="sm" />
                      </div>
                    </div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      詳細
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* この企業に卸された案件 */}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">この企業に卸された案件</div>
          <div className="mt-3 space-y-2">
            {wholesales.length === 0 ? (
              <div className="text-sm text-slate-500">卸された案件がありません</div>
            ) : (
              wholesales.map((wholesale) => (
                <div
                  key={wholesale.id}
                  className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/projects/${wholesale.projectId}`}
                        className="font-semibold text-slate-900 hover:text-sky-600"
                      >
                        {wholesale.project?.name || wholesale.projectId}
                      </Link>
                      {wholesale.project?.company && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          元案件企業:{' '}
                          <Link
                            to={`/companies/${wholesale.project.company.id}`}
                            className="hover:text-sky-600"
                          >
                            {wholesale.project.company.name}
                          </Link>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {wholesale.unitPrice != null && (
                      <span>単価: {formatCurrency(wholesale.unitPrice)}</span>
                    )}
                    {wholesale.margin != null && (
                      <span>マージン: {wholesale.margin}%</span>
                    )}
                    {wholesale.agreedDate && (
                      <span>合意日: {formatDate(wholesale.agreedDate)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyRelationsSection
