'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useSettings } from '@/contexts/SettingsContext'

interface Notice {
  _id: string
  title: string
  message: string
  type: 'notice' | 'exam' | 'event' | 'schedule'
  targetClass: string
  scheduledAt: string | null
  isActive: boolean
  sentBy: string
  createdAt: string
}

const TYPE_CONFIG = {
  notice:   { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',     icon: '📢' },
  exam:     { color: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',         icon: '📝' },
  event:    { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200', icon: '🎉' },
  schedule: { color: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200',   icon: '📅' },
}

// Ethiopian calendar conversion
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

const ET_MONTHS = ['መስከረም','ጥቅምት','ህዳር','ታህሳስ','ጥር','የካቲት','መጋቢት','ሚያዚያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ']

function formatBothDates(isoOrDatetime: string): string {
  try {
    const d = new Date(isoOrDatetime)
    if (isNaN(d.getTime())) return isoOrDatetime
    const gy = d.getFullYear(), gm = d.getMonth()+1, gd = d.getDate()
    const [ey, em, ed] = toEthiopian(gy, gm, gd)
    const gcStr = d.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const ecStr = `${ed} ${ET_MONTHS[em-1]} ${ey} E.C`
    return `${gcStr}  ·  ${ecStr}`
  } catch { return isoOrDatetime }
}

function formatBothDatesShort(isoOrDatetime: string): string {
  try {
    const d = new Date(isoOrDatetime)
    if (isNaN(d.getTime())) return isoOrDatetime
    const gy = d.getFullYear(), gm = d.getMonth()+1, gd = d.getDate()
    const [ey, em, ed] = toEthiopian(gy, gm, gd)
    const gcStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
    const ecStr = `${ed} ${ET_MONTHS[em-1]} ${ey} E.C`
    return `${gcStr}  ·  ${ecStr}`
  } catch { return isoOrDatetime }
}

export default function NoticePage() {
  const { theme, getText } = useSettings()
  const dk = theme === 'dark'

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // form
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'notice' | 'exam' | 'event' | 'schedule'>('notice')
  const [targetClass, setTargetClass] = useState('all')
  const [scheduledAt, setScheduledAt] = useState('')

  const fetchNotices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/notices`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotices(res.data)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      return toast.error(getText('Title and message are required', 'ርዕስ እና መልእክት አስፈላጊ ናቸው'))
    }
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/notices`, {
        title: title.trim(),
        message: message.trim(),
        type,
        targetClass,
        scheduledAt: scheduledAt || null,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setNotices(prev => [res.data, ...prev])
      setTitle(''); setMessage(''); setType('notice'); setTargetClass('all'); setScheduledAt('')
      toast.success(getText('Notice sent to portal!', 'ማስታወቂያው ወደ ፖርታል ተልኳል!'))
    } catch { 
      toast.error(getText('Failed to send notice', 'ማስታወቂያ መላክ አልተሳካም')) 
    } finally { 
      setSending(false) 
    }
  }

  const toggleActive = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/notices/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotices(prev => prev.map(n => n._id === id ? res.data : n))
    } catch { 
      toast.error(getText('Failed to update', 'ማዘመን አልተሳካም')) 
    }
  }

  const deleteNotice = async (id: string) => {
    if (!confirm(getText('Are you sure you want to delete this notice?', 'ይህንን ማስታወቂያ መሰረዝ ይፈልጋሉ?'))) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/notices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotices(prev => prev.filter(n => n._id !== id))
      toast.success(getText('Deleted', 'ተሰርዟል'))
    } catch { 
      toast.error(getText('Failed to delete', 'መሰረዝ አልተሳካም')) 
    }
  }

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'notice': return getText('Notice', 'ማስታወቂያ')
      case 'exam': return getText('Exam', 'ፈተና')
      case 'event': return getText('Event', 'ዝግጅት')
      case 'schedule': return getText('Schedule', 'መርሃ-ግብር')
      default: return t
    }
  }

  const card = `rounded-xl border shadow-sm ${dk ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
  const inp  = `w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dk ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`
  const lbl  = `block text-xs font-semibold mb-1 ${dk ? 'text-gray-300' : 'text-gray-600'}`

  return (
    <DashboardLayout pageTitle={getText('Send Notice to Portal', 'ማስታወቂያ ወደ ፖርታል ላክ')}>
      <div className={`min-h-screen p-3 sm:p-6 ${dk ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header */}
          <div>
            <h1 className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {getText('Send Notice to Portal', 'ማስታወቂያ ወደ ፖርታል ላክ')}
            </h1>
            <p className={`text-sm mt-0.5 ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
              {getText(
                'Notices, exam schedules, and events appear on the student & teacher portal dashboard.',
                'ማስታወቂያዎች፣ የፈተና መርሃ-ግብሮች እና ዝግጅቶች በተማሪ እና መምህራን ፖርታል ዳሽቦርድ ላይ ይታያሉ።'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── Compose Form ── */}
            <div className={`lg:col-span-2 ${card} p-5`}>
              <h2 className={`text-sm font-bold mb-4 ${dk ? 'text-white' : 'text-gray-800'}`}>
                📤 {getText('Compose Notice', 'ማስታወቂያ አዘጋጅ')}
              </h2>
              <form onSubmit={handleSend} className="space-y-3">

                {/* Type */}
                <div>
                  <label className={lbl}>{getText('Type', 'ዓይነት')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['notice','exam','event','schedule'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                          type === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : dk ? 'border-gray-600 text-gray-300 hover:border-blue-400' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}>
                        {TYPE_CONFIG[t].icon} {getTypeLabel(t)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Class */}
                <div>
                  <label className={lbl}>{getText('Target Class', 'ዒላማ ክፍል')}</label>
                  <select value={targetClass} onChange={e => setTargetClass(e.target.value)} className={inp}>
                    <option value="all">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                    <option value="Nursery">{getText('Nursery', 'ጀማሪ (Nursery)')}</option>
                    <option value="LKG">{getText('LKG', 'ደረጃ 1 (LKG)')}</option>
                    <option value="UKG">{getText('UKG', 'ደረጃ 2 (UKG)')}</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className={lbl}>{getText('Title *', 'ርዕስ *')}</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={getText('e.g. Exam Schedule – November', 'ለምሳሌ፡ የህዳር ወር ፈተና መርሃ-ግብር')}
                    className={inp}
                    maxLength={120}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className={lbl}>{getText('Message *', 'መልእክት *')}</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={getText('Write the full notice or schedule details here...', 'ሙሉውን ማስታወቂያ ወይም የመርሃ-ግብር ዝርዝር እዚህ ይጻፉ...')}
                    rows={5}
                    className={`${inp} resize-none`}
                    maxLength={1000}
                  />
                  <p className={`text-right text-[10px] mt-0.5 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>{message.length}/1000</p>
                </div>

                {/* Scheduled Date (for exam/event/schedule) */}
                {(type === 'exam' || type === 'event' || type === 'schedule') && (
                  <div>
                    <label className={lbl}>{getText('Date / Time (G.C)', 'ቀን / ሰዓት (እ.ኤ.አ)')}</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={inp} />
                    {scheduledAt && (
                      <p className={`text-xs mt-1 font-medium ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                        📅 {formatBothDates(scheduledAt)}
                      </p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={sending}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-md">
                  {sending
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {getText('Sending...', 'በመላክ ላይ...')}</>
                    : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> {getText('Send to Portal', 'ወደ ፖርታል ላክ')}</>
                  }
                </button>
              </form>
            </div>

            {/* ── Notices List ── */}
            <div className="lg:col-span-3 space-y-3">
              <div className={`flex items-center justify-between px-1`}>
                <h2 className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-800'}`}>
                  {getText('Sent Notices', 'የተላኩ ማስታወቂያዎች')} ({notices.length})
                </h2>
                <span className={`text-xs ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getText('Active notices show on portal', 'ንቁ ማስታወቂያዎች በፖርታል ላይ ይታያሉ')}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : notices.length === 0 ? (
                <div className={`${card} p-12 text-center`}>
                  <p className={`text-sm ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText('No notices sent yet.', 'እስካሁን ምንም ማስታወቂያ አልተላከም።')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                  {notices.map(n => {
                    const meta = TYPE_CONFIG[n.type] || TYPE_CONFIG.notice
                    return (
                      <div key={n._id} className={`${card} p-4 ${!n.isActive ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0 mt-0.5">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{getTypeLabel(n.type)}</span>
                              {n.targetClass !== 'all' && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dk ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{n.targetClass}</span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                {n.isActive ? getText('Visible', 'የሚታይ') : getText('Hidden', 'የተደበቀ')}
                              </span>
                            </div>
                            <p className={`text-sm font-semibold leading-tight ${dk ? 'text-white' : 'text-gray-900'}`}>{n.title}</p>
                            <p className={`text-xs mt-1 line-clamp-2 ${dk ? 'text-gray-400' : 'text-gray-500'}`}>{n.message}</p>
                            {n.scheduledAt && (
                              <p className={`text-xs mt-1 font-medium ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                📅 {formatBothDates(n.scheduledAt)}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-[10px] ${dk ? 'text-gray-500' : 'text-gray-400'}`}>{getText('By', 'በ')} {n.sentBy}</span>
                              <span className={`text-[10px] ${dk ? 'text-gray-500' : 'text-gray-400'}`}>{formatBothDatesShort(n.createdAt)}</span>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button onClick={() => toggleActive(n._id)} title={n.isActive ? getText('Hide', 'ደብቅ') : getText('Show', 'አሳይ')}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                n.isActive
                                  ? dk ? 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  : dk ? 'bg-green-900/80 text-green-300 hover:bg-green-800' : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}>
                              {n.isActive ? '👁' : '✓'}
                            </button>
                            <button onClick={() => deleteNotice(n._id)} title={getText('Delete', 'ሰርዝ')}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${dk ? 'bg-red-900/80 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
