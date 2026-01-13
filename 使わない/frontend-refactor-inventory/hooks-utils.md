# Hooks/Contexts と Utils

## Hooks/Contexts
| ファイル | エクスポート | 備考 |
| --- | --- | --- |
| contexts/AuthContext.tsx | AuthProvider, useAuth | 認証状態、login/logout、auth_token を localStorage に保存 |
| hooks/useApi.ts | useFetch, useMutation | apiRequest ラッパー、キャッシュ/リトライ対応 |
| hooks/useDebouncedValue.ts | useDebouncedValue | デバウンス |
| hooks/useKeyboardShortcut.ts | useKeyboardShortcut | ショートカット |
| hooks/usePagination.ts | usePagination | ページング状態 |
| hooks/usePermissions.ts | usePermissions | ロール判定 |
| hooks/useToast.ts | useToast | トースト |
| hooks/useUrlSync.ts | useUrlSync | URL同期 |

## Lib/Utils/Constants（関数カタログ）
| ファイル | エクスポート |
| --- | --- |
| lib/apiClient.ts | ApiRequestError, apiRequest, apiDownload, apiGet, apiSend |
| lib/apiCache.ts | getCache, setCache, clearCache |
| lib/apiRoutes.ts | apiRoutes |
| utils/date.ts | formatDate, formatDateInput, formatDateGroup, isToday, isYesterday |
| utils/format.ts | formatCurrency |
| utils/string.ts | getInitials, getAvatarColor |
| utils/routes.ts | getTargetPath |
| constants/labels.ts | TASK_STATUS_OPTIONS, PROJECT_STATUS_OPTIONS, WHOLESALE_STATUS_OPTIONS, TARGET_TYPE_OPTIONS, COMPANY_CATEGORY_DEFAULT_OPTIONS, COMPANY_STATUS_DEFAULT_OPTIONS, statusLabel, targetTypeLabel |
