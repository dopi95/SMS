const ET_MONTHS = [
  'መስከረም','ጥቅምት','ህዳር','ታህሳስ','ጥር','የካቲት',
  'መጋቢት','ሚያዚያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ'
]

function toEthiopian(gy: number, gm: number, gd: number): [number, number, number] {
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