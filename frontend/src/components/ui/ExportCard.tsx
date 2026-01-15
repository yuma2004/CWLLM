import type { ReactNode } from 'react'
import Button from './Button'
import Card from './Card'

type ExportCardProps = {
  title: string
  children: ReactNode
  onDownload: () => void
  isLoading: boolean
  loadingLabel?: string
  buttonLabel: string
}

const ExportCard = ({
  title,
  children,
  onDownload,
  isLoading,
  loadingLabel,
  buttonLabel,
}: ExportCardProps) => (
  <Card>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    <div className="mt-4 flex justify-end">
      <Button type="button" onClick={onDownload} isLoading={isLoading} loadingLabel={loadingLabel}>
        {buttonLabel}
      </Button>
    </div>
  </Card>
)

export default ExportCard
