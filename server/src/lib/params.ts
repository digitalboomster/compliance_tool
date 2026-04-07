/** Express 5 types params as string | string[] */
export function pathParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value[0]) return value[0]
  return ''
}
