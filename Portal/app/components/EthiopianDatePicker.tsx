'use client'
import { useState, useEffect } from 'react'

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

function toGregorian(ey: number, em: number, ed: number): [number, number, number] {
  const nyd=Math.floor(ey/100)-Math.floor(ey/400)-4+((ey-1)%4===3?1:0)
  let gy=ey+7
  const gMonths=[0,30,31,30,31,31,28,31,30,31,30,31,31,30]
  const ny=gy+1
  if((ny%4===0&&ny%100!==0)||ny%400===0) gMonths[6]=29
  let until=((em-1)*30)+ed+nyd-1
  let m=0,gd=1
  for(let i=0;i<gMonths.length;i++){
    if(until<=gMonths[i]){m=i;gd=until;break}
    else{m=i;until-=gMonths[i]}
  }
  if(m>4) gy+=1
  const order=[8,9,10,11,12,1,2,3,4,5,6,7,8,9]
  return [gy, order[m], gd]
}

interface Props {
  value: string // ISO YYYY-MM-DD gregorian
  onChange: (isoDate: string) => void
}

export default function EthiopianDatePicker({ value, onChange }: Props) {
  const toET = (iso: string): [number,number,number] => {
    const [y,m,d] = iso.split('-').map(Number)
    return toEthiopian(y,m,d)
  }

  const [etDate, setEtDate] = useState<[number,number,number]>(() => toET(value))

  useEffect(() => { setEtDate(toET(value)) }, [value])

  const [ey, em, ed] = etDate
  const daysInMonth = em===13 ? (ey%4===3?6:5) : 30
  const currentEY = toEthiopian(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate())[0]

  const update = (newEy: number, newEm: number, newEd: number) => {
    const maxDay = newEm===13?(newEy%4===3?6:5):30
    const clampedDay = Math.min(newEd, maxDay)
    setEtDate([newEy, newEm, clampedDay])
    try {
      const [gy,gm,gd] = toGregorian(newEy, newEm, clampedDay)
      onChange(`${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`)
    } catch {}
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <select value={ed} onChange={e => update(ey, em, Number(e.target.value))}
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-14 min-w-0">
        {Array.from({length: daysInMonth},(_,i)=>i+1).map(d=>(
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select value={em} onChange={e => update(ey, Number(e.target.value), ed)}
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0">
        {ET_MONTHS.map((name,i)=>(
          <option key={i+1} value={i+1}>{name}</option>
        ))}
      </select>
      <select value={ey} onChange={e => update(Number(e.target.value), em, ed)}
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 min-w-0">
        {Array.from({length:10},(_,i)=>currentEY-i).map(y=>(
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
