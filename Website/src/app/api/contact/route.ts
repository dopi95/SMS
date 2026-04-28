import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = '7622120987:AAECTaQR0ZoWfOAxLbW6SeKtWJjeiuf2Afk'
const CHAT_ID   = '2120123278'

export async function POST(req: NextRequest) {
  try {
    const { name, phone, message } = await req.json()

    const text = `
🏫 *New Message — Bluelight Academy*

👤 *Name:* ${name}
📞 *Phone:* ${phone}
💬 *Message:*
${message}

🕐 ${new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' })}
    `.trim()

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Telegram error' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
