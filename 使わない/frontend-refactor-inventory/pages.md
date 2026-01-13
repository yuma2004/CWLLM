# ページ依存マップ

| ページ | コンポーネント | Hooks/Contexts | Utils/Constants |
| --- | --- | --- | --- |
| ChatworkSettings | Button, ErrorAlert, JobProgressCard, LoadingState, Toast | useApi, usePermissions, useToast | - |
| Companies | ErrorAlert, LoadingState, FilterBadge, FormInput, FormSelect, FormTextarea, Pagination, SkeletonTable, StatusBadge | useApi, usePermissions, useDebouncedValue, useKeyboardShortcut, useUrlSync | getAvatarColor, getInitials, COMPANY_CATEGORY_DEFAULT_OPTIONS, COMPANY_STATUS_DEFAULT_OPTIONS |
| CompanyDetail | CompanyTasksSection, Badge, ConfirmDialog, ErrorAlert, Pagination, Skeleton, SkeletonAvatar, SkeletonText, StatusBadge, Tabs, Toast, FormSelect | useApi, usePagination, usePermissions, useToast | formatDateGroup, getAvatarColor, getInitials, COMPANY_CATEGORY_DEFAULT_OPTIONS, COMPANY_STATUS_DEFAULT_OPTIONS |
| Exports | Button, ErrorAlert, FormInput, FormSelect | useApi | apiDownload, TASK_STATUS_OPTIONS, TARGET_TYPE_OPTIONS, statusLabel, targetTypeLabel |
| Home | ErrorAlert | useAuth, useApi | statusLabel, targetTypeLabel, formatDate, getTargetPath |
| Login | - | useAuth | - |
| ProjectDetail | CompanySearchSelect, ConfirmDialog, ErrorAlert, EmptyState, LoadingState, FormInput, FormSelect, FormTextarea, StatusBadge | useApi, usePermissions | PROJECT_STATUS_OPTIONS, statusLabel, formatDate, formatDateInput, formatCurrency |
| Projects | CompanySearchSelect, ErrorAlert, EmptyState, FilterBadge, FormInput, FormSelect, FormTextarea, Pagination, SkeletonTable, StatusBadge | useApi, usePermissions, useDebouncedValue, useKeyboardShortcut, useUrlSync | PROJECT_STATUS_OPTIONS, statusLabel, formatCurrency |
| Settings | Button, ErrorAlert, FormInput, FormTextarea, SuccessAlert | useApi | - |
| TaskDetail | ConfirmDialog, ErrorAlert, FormInput, FormSelect, FormTextarea, StatusBadge | useApi, usePermissions | TASK_STATUS_OPTIONS, statusLabel, targetTypeLabel, formatDate, formatDateInput, getTargetPath |
| Tasks | ConfirmDialog, ErrorAlert, EmptyState, FilterBadge, FormInput, FormSelect, StatusBadge, Pagination, SkeletonTable, KanbanBoard | useApi, usePermissions, useKeyboardShortcut, useUrlSync | TASK_STATUS_OPTIONS, TARGET_TYPE_OPTIONS, statusLabel, targetTypeLabel, formatDate, formatDateInput, getTargetPath |
| WholesaleDetail | ConfirmDialog, ErrorAlert, Pagination, SkeletonTable, StatusBadge, Toast, LoadingState | useApi, usePagination, usePermissions, useToast | WHOLESALE_STATUS_OPTIONS, statusLabel, formatDate, formatDateInput, formatCurrency |
| Wholesales | CompanySearchSelect, ProjectSearchSelect, ConfirmDialog, ErrorAlert, EmptyState, FilterBadge, FormInput, FormSelect, FormTextarea, Modal, Pagination, SkeletonTable, StatusBadge | useApi, usePermissions, useKeyboardShortcut, useUrlSync | WHOLESALE_STATUS_OPTIONS, statusLabel, formatDateInput, formatCurrency |
