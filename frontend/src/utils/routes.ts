export const getTargetPath = (targetType: string, targetId: string) => {
  if (targetType === 'general') return '/tasks'
  if (targetType === 'company') return `/companies/${targetId}`
  if (targetType === 'project') return `/projects/${targetId}`
  return `/wholesales/${targetId}`
}
