import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Project {
  id: string
  name: string
  status: string
}

interface Wholesale {
  id: string
  status: string
  projectId: string
}

function CompanyRelationsSection({ companyId }: { companyId: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [wholesales, setWholesales] = useState<Wholesale[]>([])
  const [error, setError] = useState('')

  const fetchRelations = useCallback(async () => {
    setError('')
    try {
      const [projectResponse, wholesaleResponse] = await Promise.all([
        fetch(`/api/companies/${companyId}/projects`, { credentials: 'include' }),
        fetch(`/api/companies/${companyId}/wholesales`, { credentials: 'include' }),
      ])

      const projectData = await projectResponse.json()
      const wholesaleData = await wholesaleResponse.json()
      if (!projectResponse.ok) {
        throw new Error(projectData.error || 'Failed to load projects')
      }
      if (!wholesaleResponse.ok) {
        throw new Error(wholesaleData.error || 'Failed to load wholesales')
      }

      setProjects(projectData.projects || [])
      setWholesales(wholesaleData.wholesales || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }, [companyId])

  useEffect(() => {
    fetchRelations()
  }, [fetchRelations])

  return (
    <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Projects & Wholesales</h3>
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Projects</div>
          <div className="mt-3 space-y-2">
            {projects.length === 0 ? (
              <div className="text-sm text-slate-500">No projects yet.</div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{project.name}</div>
                    <div className="text-xs text-slate-500">{project.status}</div>
                  </div>
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Wholesales</div>
          <div className="mt-3 space-y-2">
            {wholesales.length === 0 ? (
              <div className="text-sm text-slate-500">No wholesales yet.</div>
            ) : (
              wholesales.map((wholesale) => (
                <div
                  key={wholesale.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{wholesale.id}</div>
                    <div className="text-xs text-slate-500">{wholesale.status}</div>
                  </div>
                  <Link
                    to={`/wholesales/${wholesale.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View
                  </Link>
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
