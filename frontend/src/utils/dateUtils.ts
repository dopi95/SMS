export const ET_MONTHS = [
  'መስከረም','ጥቅምት','ህዳር','ታህሳስ','ጥር','የካቲት',
  'መጋቢት','ሚያዚያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ'
]

export const ETHIOPIAN_ACADEMIC_MONTHS = [
  { value: 'September', en: 'Meskerem', am: 'መስከረም', ecIndex: 1 },
  { value: 'October', en: 'Tikimt', am: 'ጥቅምት', ecIndex: 2 },
  { value: 'November', en: 'Hidar', am: 'ህዳር', ecIndex: 3 },
  { value: 'December', en: 'Tahsas', am: 'ታህሳስ', ecIndex: 4 },
  { value: 'January', en: 'Tir', am: 'ጥር', ecIndex: 5 },
  { value: 'February', en: 'Yekatit', am: 'የካቲት', ecIndex: 6 },
  { value: 'March', en: 'Megabit', am: 'መጋቢት', ecIndex: 7 },
  { value: 'April', en: 'Miazia', am: 'ሚያዚያ', ecIndex: 8 },
  { value: 'May', en: 'Ginbot', am: 'ግንቦት', ecIndex: 9 },
  { value: 'June', en: 'Sene', am: 'ሰኔ', ecIndex: 10 },
] as const

export function toEthiopian(gy: number, gm: number, gd: number): [number, number, number] {
  const gMonths = [0,31,28,31,30,31,30,31,31,30,31,30,31]
  if ((gy%4===0&&gy%100!==0)||gy%400===0) gMonths[2]=29
  let ey = gy - 8
  const eMonths = [0,30,30,30,30,30,30,30,30,30,5,30,30,30,30]
  if (ey%4===3) eMonths[10]=6
  const nyd = Math.floor(gy/100)-Math.floor(gy/400)-4+((gy-9)%4===3?1:0)
  let until=0
  for(let i=1;i<gm;i++) until+=gMonths[i]
  until+=gd
  let tahissas=(ey%4)===0?26:25
  if(until<=277&&gy===1582){eMonths[1]=0;eMonths[2]=tahissas}
  else{tahissas=nyd-3;eMonths[1]=tahissas}
  let m=1,ed=1
  for(m=1;m<eMonths.length;m++){
    if(until<=eMonths[m]){ed=(m===1||eMonths[m]===0)?until+(30-tahissas):until;break}
    else until-=eMonths[m]
  }
  if(m>10) ey+=1
  const order=[0,4,5,6,7,8,9,10,11,12,13,1,2,3,4]
  return [ey, order[m], ed]
}

export function getCurrentEthiopianDate(date: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return { year, month, day }
}

export function getCurrentEthiopianAcademicMonth(date: Date = new Date()): string {
  const { month } = getCurrentEthiopianDate(date)
  const matched = ETHIOPIAN_ACADEMIC_MONTHS.find(m => m.ecIndex === month)
  if (matched) return matched.value
  return 'September'
}

export function getCurrentEthiopianYear(date: Date = new Date()): number {
  return getCurrentEthiopianDate(date).year
}

export function getEthiopianMonthDisplay(monthValue: string, lang: string = 'en'): string {
  const matched = ETHIOPIAN_ACADEMIC_MONTHS.find(m => m.value.toLowerCase() === monthValue.toLowerCase())
  if (!matched) return monthValue
  return lang === 'am' ? `${matched.am} (${matched.en})` : `${matched.en} (${matched.am})`
}

export function getAcademicMonthIndex(month: string): number {
  if (!month) return 0
  const normalized = month.trim().toLowerCase()
  const matched = ETHIOPIAN_ACADEMIC_MONTHS.find(
    m => m.value.toLowerCase() === normalized || m.en.toLowerCase() === normalized || m.am === month.trim()
  )
  if (matched) return matched.ecIndex
  if (normalized === 'july' || normalized === 'hamle' || month.trim() === 'ሐምሌ') return 11
  if (normalized === 'august' || normalized === 'nehase' || month.trim() === 'ነሐሴ') return 12
  if (normalized === 'pagume' || normalized === 'pagumien' || month.trim() === 'ጳጉሜ') return 13
  return 0
}

export function sortPaymentsByAcademicDate<T extends Record<string, any>>(
  payments: T[],
  order: 'desc' | 'asc' = 'desc'
): T[] {
  if (!Array.isArray(payments)) return []
  return [...payments].sort((a, b) => {
    const yearA = Number(a.year) || 0
    const yearB = Number(b.year) || 0
    if (yearA !== yearB) {
      return order === 'desc' ? yearB - yearA : yearA - yearB
    }
    const monthA = getAcademicMonthIndex(a.month || '')
    const monthB = getAcademicMonthIndex(b.month || '')
    if (monthA !== monthB) {
      return order === 'desc' ? monthB - monthA : monthA - monthB
    }
    const timeA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
    const timeB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
    return order === 'desc' ? timeB - timeA : timeA - timeB
  })
}

export function calcAgeFromECString(dob: string): number | null {
  // dob format: dd/mm/yyyy (Ethiopian Calendar)
  const parts = dob.split('/')
  if (parts.length !== 3) return null
  const dd = parseInt(parts[0].trim())
  const mm = parseInt(parts[1].trim())
  const yyyy = parseInt(parts[2].trim())
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null
  return calcAgeFromEC(dd, mm, yyyy)
}

// Accepts either "dd/mm/yyyy" EC string or ISO date string, returns age in EC years
export function calcAgeFromDOB(dob: string): number | null {
  if (!dob) return null
  if (dob.includes('/')) return calcAgeFromECString(dob)
  const date = parseDOB(dob)
  if (!date) return null
  const [ey, em, ed] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return calcAgeFromEC(ed, em, ey)
}

// Accepts either "dd/mm/yyyy" EC string or ISO date string, returns "dd/mm/yyyy" EC
// Returns "DD MonthName YYYY E.C" e.g. "07 ነሐሴ 2007 E.C"
export function formatDOBAsECFull(dob: string): string {
  if (!dob) return '-'
  let dd: number, mm: number, yyyy: number
  if (dob.includes('/')) {
    const parts = dob.split('/')
    if (parts.length !== 3) return dob
    dd = parseInt(parts[0].trim())
    mm = parseInt(parts[1].trim())
    yyyy = parseInt(parts[2].trim())
  } else {
    const date = new Date(dob)
    if (isNaN(date.getTime())) return dob
    ;[yyyy, mm, dd] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy) || mm < 1 || mm > 13) return dob
  return `${String(dd).padStart(2, '0')} ${ET_MONTHS[mm - 1]} ${yyyy} E.C`
}

function parseDOB(dob: string): Date | null {
  if (!dob) return null
  const d = new Date(dob)
  return isNaN(d.getTime()) ? null : d
}

export function formatDOBAsEC(dob: string): string {
  if (!dob) return '-'
  if (dob.includes('/')) {
    const parts = dob.split('/')
    if (parts.length === 3) {
      const dd = parts[0].trim().padStart(2, '0')
      const mm = parts[1].trim().padStart(2, '0')
      const yyyy = parts[2].trim()
      return `${dd}/${mm}/${yyyy}`
    }
    return dob
  }
  const date = parseDOB(dob)
  if (!date) return dob
  const [ey, em, ed] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return `${String(ed).padStart(2, '0')}/${String(em).padStart(2, '0')}/${ey}`
}

function calcAgeFromEC(dd: number, mm: number, yyyy: number): number | null {
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null
  const today = new Date()
  const gcYear = today.getFullYear()
  const gcMonth = today.getMonth() + 1
  const gcDay = today.getDate()
  const afterEnkutatash = gcMonth > 9 || (gcMonth === 9 && gcDay >= 11)
  const todayECYear = afterEnkutatash ? gcYear - 7 : gcYear - 8
  const gcToECMonth = [5,6,7,8,9,10,11,12,13,1,2,3,4]
  let todayECMonth: number
  let todayECDay: number
  if (gcMonth === 9 && gcDay < 11) {
    todayECMonth = 13; todayECDay = gcDay
  } else {
    todayECMonth = gcToECMonth[gcMonth - 1]; todayECDay = gcDay
  }
  let age = todayECYear - yyyy
  if (todayECMonth < mm || (todayECMonth === mm && todayECDay < dd)) age--
  return age >= 0 ? age : null
}

export function formatDateWithBothCalendars(dateString: string): string {
  const date = new Date(dateString)
  const gy = date.getFullYear()
  const gm = date.getMonth() + 1
  const gd = date.getDate()
  
  // Gregorian format
  const gcDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  
  // Ethiopian format
  const [ey, em, ed] = toEthiopian(gy, gm, gd)
  const ecDate = `${ed} ${ET_MONTHS[em - 1]} ${ey}`
  
  return `${gcDate} (${ecDate} E.C)`
}