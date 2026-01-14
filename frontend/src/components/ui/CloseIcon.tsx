import type { SVGProps } from 'react'

type CloseIconProps = SVGProps<SVGSVGElement>

const CloseIcon = ({ className = 'h-4 w-4', ...props }: CloseIconProps) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default CloseIcon
