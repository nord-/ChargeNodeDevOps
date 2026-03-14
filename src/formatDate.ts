const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number) {
  return n < 10 ? '0' + n : String(n)
}

function timeStr(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDate(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (dateOnly.getTime() === today.getTime()) {
    return `Today ${timeStr(d)}`
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr(d)}`
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${timeStr(d)}`
  }
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${timeStr(d)}`
}
