'use client'

import { useState, useRef, useEffect } from 'react'

const FONTS = [
  { label: 'Segoe UI', value: "'Segoe UI',Arial,sans-serif" },
  { label: 'Georgia',  value: 'Georgia,serif' },
  { label: 'Times New Roman', value: "'Times New Roman',serif" },
  { label: 'Verdana',  value: 'Verdana,sans-serif' },
  { label: 'Tahoma',   value: 'Tahoma,sans-serif' },
]

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MessagePage() {
  const cardRef = useRef<HTMLDivElement>(null)

  const [title,      setTitle]      = useState('Important School Announcement')
  const [body,       setBody]       = useState(`Dear Parents and Students,\n\nWe would like to inform you that…\n\nPlease ensure all students are present on time. For any inquiries, feel free to contact us through the details above.\n\nThank you for your continued support.`)
  const [titleColor, setTitleColor] = useState('#0f172a')
  const [bodyColor,  setBodyColor]  = useState('#1e293b')
  const [bodySize,   setBodySize]   = useState(15)
  const [font,       setFont]       = useState(FONTS[0].value)
  const [dateType,   setDateType]   = useState('Date')
  const [dateVal, setDateVal] = useState('')

  useEffect(() => {
    setDateVal(todayStr())
  }, [])
  const [tag,        setTag]        = useState('NOTICE')
  const [downloading, setDownloading] = useState(false)

  // Load html2canvas dynamically
  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    document.head.appendChild(s)
  }, [])

  const handleDownload = async () => {
    const card = cardRef.current
    if (!card) return
    setDownloading(true)
    await new Promise(r => setTimeout(r, 100))
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(card, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: null, logging: false,
        width: card.offsetWidth, height: card.offsetHeight,
      })
      const radius = 44
      const w = canvas.width, h = canvas.height
      const rounded = document.createElement('canvas')
      rounded.width = w; rounded.height = h
      const ctx = rounded.getContext('2d')!
      ctx.beginPath()
      ctx.moveTo(radius, 0); ctx.lineTo(w - radius, 0)
      ctx.quadraticCurveTo(w, 0, w, radius)
      ctx.lineTo(w, h - radius); ctx.quadraticCurveTo(w, h, w - radius, h)
      ctx.lineTo(radius, h); ctx.quadraticCurveTo(0, h, 0, h - radius)
      ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath(); ctx.clip(); ctx.drawImage(canvas, 0, 0)
      const a = document.createElement('a')
      a.download = `Bluelight_${tag}_${dateVal.replace(/\s/g, '_')}.png`
      a.href = rounded.toDataURL('image/png')
      a.click()
    } catch { alert('Download failed.') }
    setDownloading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 px-4 pb-16">

      {/* Toolbar */}
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-7 flex flex-wrap gap-4 items-end">

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Title Color</label>
          <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)}
            className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Body Color</label>
          <input type="color" value={bodyColor} onChange={e => setBodyColor(e.target.value)}
            className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Body Size</label>
          <input type="range" min={12} max={22} value={bodySize} onChange={e => setBodySize(+e.target.value)}
            className="w-24 accent-blue-500" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Font</label>
          <select value={font} onChange={e => setFont(e.target.value)} suppressHydrationWarning
            className="bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500">
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Date Type</label>
          <select value={dateType} onChange={e => setDateType(e.target.value)} suppressHydrationWarning
            className="bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500">
            <option>Date</option>
            <option>ቀን</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Value</label>
          <input value={dateVal} onChange={e => setDateVal(e.target.value)} suppressHydrationWarning
            className="bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-36" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tag</label>
          <input value={tag} onChange={e => setTag(e.target.value)} suppressHydrationWarning
            className="bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-24" />
        </div>

        <button onClick={handleDownload} disabled={downloading} suppressHydrationWarning
          className="ml-auto bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-xl px-6 py-2.5 text-sm shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 hover:shadow-amber-500/50 active:scale-95 transition-all disabled:opacity-60">
          {downloading ? 'Generating…' : '⬇ Download Image'}
        </button>
      </div>

      {/* Card */}
      <div ref={cardRef} style={{ width: 720, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,.55)', fontFamily: font }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 35%,#3b82f6 65%,#60a5fa 100%)', position: 'relative', overflow: 'hidden' }}>
          {/* Orbs */}
          <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 70%)', top:-80, left:-60, pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,.12) 0%,transparent 70%)', bottom:-60, right:80, pointerEvents:'none' }} />
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:.07, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'22px 22px' }} />

          <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', padding:'26px 32px 22px', gap:22 }}>
            {/* Logo */}
            <div style={{ flexShrink:0, width:86, height:86, borderRadius:'50%', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon.png" alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>

            {/* Brand */}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:.4, lineHeight:1.1, textShadow:'0 2px 10px rgba(0,0,0,.25)' }}>
                Bluelight <span style={{ color:'#fde68a' }}>Academy</span>
              </div>
              <div style={{ width:48, height:3, borderRadius:2, background:'linear-gradient(90deg,#fde68a,#f59e0b)', margin:'7px 0 8px' }} />
              <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontStyle:'italic', fontWeight:500, letterSpacing:.4 }}>
                &ldquo;Be the light, Lead the way!&rdquo;
              </div>
            </div>

            {/* Contacts */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-start', flexShrink:0 }}>
              {[
                { icon: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H7.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.23 1.01L6.6 10.8z', label: '+251945409940', sub: 'Phone' },
                { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', label: 'bluelight.edu.et', sub: 'Website' },
                { icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z', label: 'contact@bluelight.edu.et', sub: 'Email' },
              ].map(c => (
                <div key={c.sub} style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" style={{ width:13, height:13, fill:'#fde68a' }}><path d={c.icon}/></svg>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <span style={{ fontSize:11.5, color:'#fff', fontWeight:600, lineHeight:1.3 }}>{c.label}</span>
                    <span style={{ fontSize:9.5, color:'rgba(255,255,255,.55)', fontWeight:400 }}>{c.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 720 28" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:28, marginTop:-1 }}>
          <path d="M0,0 C120,28 240,0 360,18 C480,36 600,8 720,22 L720,28 L0,28 Z" fill="#fff"/>
        </svg>

        {/* Date bar */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'9px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#0f172a', letterSpacing:.2 }}>{dateType}: {dateVal}</span>
          <span style={{ background:'#fff', border:'1.5px solid #2563eb', color:'#1d4ed8', borderRadius:20, padding:'4px 16px', fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase' }}>{tag}</span>
        </div>

        {/* Body */}
        <div style={{ padding:'28px 36px 24px', background:'#fff' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ fontSize:21, fontWeight:800, color:titleColor, fontFamily:font, border:'none', outline:'none', width:'100%', background:'transparent', borderBottom:'2px solid #e2e8f0', paddingBottom:9, marginBottom:16 }}
            placeholder="Message Title / Subject…"
            suppressHydrationWarning
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'16px 18px', fontFamily:font, fontSize:bodySize, lineHeight:1.8, color:bodyColor, resize:'vertical', outline:'none', background:'#fafcff' }}
            placeholder="Type your message here…"
          />
          <div style={{ height:1, background:'linear-gradient(90deg,transparent,#bfdbfe 30%,#bfdbfe 70%,transparent)', margin:'22px 0' }} />
        </div>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'stretch', height:88, background:'#fff', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', padding:'10px 18px 10px 22px', flexShrink:0, background:'#fff', zIndex:2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.png" alt="Logo" style={{ width:50, height:50, borderRadius:'50%', objectFit:'contain' }} />
            <span style={{ marginLeft:12, fontSize:12, fontStyle:'italic', fontWeight:600, color:'#1e40af', whiteSpace:'nowrap' }}>&ldquo;Be the light, Lead the way!&rdquo;</span>
          </div>
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <svg viewBox="0 0 600 88" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
              <path d="M0,88 L0,44 Q60,0 150,24 Q260,54 380,20 Q480,0 600,34 L600,88 Z" fill="#1e40af"/>
              <path d="M0,88 L0,64 Q80,24 200,46 Q320,68 440,36 Q520,17 600,51 L600,88 Z" fill="#3b82f6" opacity="0.7"/>
            </svg>
            <div style={{ position:'absolute', right:22, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:3, zIndex:3 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/qrcode.png" alt="QR" style={{ width:58, height:58, borderRadius:6, border:'2px solid rgba(255,255,255,.9)', background:'#fff' }} />
              <span style={{ fontSize:8.5, fontWeight:700, color:'#fff', letterSpacing:.4, textAlign:'center', textShadow:'0 1px 3px rgba(0,0,0,.4)', whiteSpace:'nowrap' }}>Scan to visit website</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
