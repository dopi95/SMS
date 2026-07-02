'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useSettings } from '@/contexts/SettingsContext';

type Row = { id: number; cells: string[] };

const DEFAULT_COLUMNS = ['ተ.ቁ', 'የሰራተኛው ስም', 'ወርሃዊ የተጣራ ደሞዝ', 'ወር', 'አካውንት ቁጥር'];

const DEFAULT_ROWS: Row[] = [
  { id: 1,  cells: ['1',  'አይናለም ጥላሁን',   '8430.00',  'ግንቦት', '013361430887200'] },
  { id: 2,  cells: ['2',  'ደብሪቱ ስሜነህ',    '10000.00', 'ግንቦት', '013361426551900'] },
  { id: 3,  cells: ['3',  'ፍሬህይወት አበበ',   '9555.00',  'ግንቦት', '013471060720700'] },
  { id: 4,  cells: ['4',  'ቤተልሄም ሰይፈ',    '15015.00', 'ግንቦት', '013361430835600'] },
  { id: 5,  cells: ['5',  'የማታወርቅ አሰፋ',   '15015.00', 'ግንቦት', '013361426516900'] },
  { id: 6,  cells: ['6',  'ዮርዳኖስ ሙሉሰው',   '7030.00',  'ግንቦት', '013360950396900'] },
  { id: 7,  cells: ['7',  'እየሩስ ገበየሁ',    '6620.00',  'ግንቦት', ''] },
  { id: 8,  cells: ['8',  'ኮከብ ሲሳይ',      '7350.00',  'ግንቦት', '01347642826100'] },
  { id: 9,  cells: ['9',  'ድግሴ ቢተው',      '6168.00',  'ግንቦት', '013471431361800'] },
  { id: 10, cells: ['10', 'አበበች ወንድምነው',  '5108.00',  'ግንቦት', '013471556399400'] },
  { id: 11, cells: ['11', 'አበቡ አለኸኝ',     '4640.00',  'ግንቦት', ''] },
  { id: 12, cells: ['12', 'አለምዘውድ እምሻው',  '6620.00',  'ግንቦት', ''] },
  { id: 13, cells: ['13', 'ብርቱካንአበበ',     '6620.00',  'ግንቦት', ''] },
  { id: 14, cells: ['14', 'ደስታ አማረ',      '24250.18', 'ግንቦት', '013201405925500'] },
  { id: 15, cells: ['15', 'ውብአየሁ ሻውል',   '9555.00',  'ግንቦት', '01320105708100'] },
  { id: 16, cells: ['16', 'ደምስ አያሌው',     '5756.00',  'ግንቦት', '013361407351100'] },
  { id: 17, cells: ['17', 'ዮሐንስ ስብሐቱ',   '5756.00',  'ግንቦት', '013361407397500'] },
];

// salary column index (index 2 in default columns)
const SALARY_COL_DEFAULT_IDX = 2;
// month column index (index 3 in default columns)
const MONTH_COL_IDX = 3;

function toEthiopicWords(n: number): string {
  // Simple numeric fallback — full Ethiopic word conversion is complex
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalaryListPage() {
  const { theme } = useSettings();
  const router = useRouter();
  const isDark = theme === 'dark';

  const [columns, setColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMNS;
    try { const s = localStorage.getItem('salaryList'); return s ? JSON.parse(s).columns : DEFAULT_COLUMNS; } catch { return DEFAULT_COLUMNS; }
  });
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ROWS;
    try { const s = localStorage.getItem('salaryList'); return s ? JSON.parse(s).rows : DEFAULT_ROWS; } catch { return DEFAULT_ROWS; }
  });
  const [salaryColIdx, setSalaryColIdx] = useState(SALARY_COL_DEFAULT_IDX);
  const [nextId, setNextId] = useState(() => {
    if (typeof window === 'undefined') return 18;
    try { const s = localStorage.getItem('salaryList'); return s ? JSON.parse(s).nextId : 18; } catch { return 18; }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [monthColIdx] = useState(MONTH_COL_IDX);

  // Restore rich-text content from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem('salaryList');
      if (!s) return;
      const parsed = JSON.parse(s);
      if (parsed.topHtml && topRef.current) topRef.current.innerHTML = parsed.topHtml;
      if (parsed.bottomHtml && bottomRef.current) bottomRef.current.innerHTML = parsed.bottomHtml;
    } catch {}
  }, []);

  const currentMonth = rows[0]?.cells[monthColIdx] ?? '';

  const updateAllMonths = (value: string) => {
    setHasChanges(true);
    setRows(prev => prev.map(r => ({
      ...r,
      cells: r.cells.map((c, i) => i === monthColIdx ? value : c)
    })));
  };

  // Rich-text refs for the letter paragraphs above and below the table
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLDivElement | null>(null);

  // Compute total from salary column
  const total = rows.reduce((sum, row) => {
    const val = parseFloat(row.cells[salaryColIdx] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalFormatted = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Row operations ──────────────────────────────────────────
  const deleteRow = (id: number) => {
    setHasChanges(true);
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.map((r, i) => {
        const updated = [...r.cells];
        if (!isNaN(Number(updated[0]))) updated[0] = String(i + 1);
        return { ...r, cells: updated };
      });
    });
  };

  const addRow = () => {
    setHasChanges(true);
    const newCells = columns.map((_, ci) => ci === 0 ? String(rows.length + 1) : '');
    setRows(prev => [...prev, { id: nextId, cells: newCells }]);
    setNextId(n => n + 1);
  };

  const updateCell = (rowId: number, colIdx: number, value: string) => {
    setHasChanges(true);
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, cells: r.cells.map((c, i) => i === colIdx ? value : c) } : r
    ));
  };

  // ── Column operations ────────────────────────────────────────
  const deleteColumn = (colIdx: number) => {
    setHasChanges(true);
    setColumns(prev => prev.filter((_, i) => i !== colIdx));
    setRows(prev => prev.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== colIdx) })));
    setSalaryColIdx(prev => {
      if (colIdx === prev) return -1;
      if (colIdx < prev) return prev - 1;
      return prev;
    });
  };

  const updateColumnHeader = (colIdx: number, value: string) => {
    setHasChanges(true);
    setColumns(prev => prev.map((c, i) => i === colIdx ? value : c));
  };

  const handleSave = () => {
    localStorage.setItem('salaryList', JSON.stringify({
      columns, rows, nextId,
      topHtml: topRef.current?.innerHTML ?? '',
      bottomHtml: bottomRef.current?.innerHTML ?? '',
    }));
    setHasChanges(false);
  };

  // ── Rich-text toolbar ────────────────────────────────────────
  const exec = useCallback((cmd: string, value?: string) => {
    lastFocused.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  const handlePrint = () => {
    const top = topRef.current?.innerHTML || '';
    const bottom = bottomRef.current?.innerHTML || '';

    const tableHtml = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#e8e8e8;">
            ${columns.map(c => `<th style="border:1px solid #888;text-align:center;">${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.cells.map(c => `<td style="border:1px solid #888;padding:6px 10px;">${c}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title></title>
      <style>
        @page{margin:0;size:A4;}
        body{font-family:'Nyala','Ethiopic',serif;margin:15mm;font-size:14px;line-height:1.9;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #888;padding:6px 10px;}
      </style></head><body>
      <div>${top}</div>
      ${tableHtml}
      <div style="margin-top:24px;">${bottom}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  const btn = `px-2.5 py-1.5 rounded text-sm font-medium transition-colors border ${
    isDark ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
           : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`;
  const sep = <div className={`w-px h-6 mx-1 self-center ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />;

  const inputCls = `w-full bg-transparent outline-none focus:bg-blue-50 focus:dark:bg-blue-900/20 rounded px-1 min-w-0 ${isDark ? 'text-gray-100' : 'text-gray-900'}`;

  return (
    <DashboardLayout pageTitle="የሰራተኞች ደሞዝ ዝርዝር">
      <div className={`min-h-screen p-4 sm:p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <button onClick={() => router.back()}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              የሰራተኞች ደሞዝ ዝርዝር
            </h1>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
              <span className={`text-sm font-medium whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>ወር:</span>
              <input
                value={currentMonth}
                onChange={e => updateAllMonths(e.target.value)}
                placeholder="ወር ያስገቡ"
                className={`text-sm outline-none bg-transparent w-24 ${isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            <button onClick={handleSave} disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                hasChanges
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>

          {/* Card */}
          <div className={`rounded-xl shadow-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

            {/* Toolbar */}
            <div className={`px-4 py-3 border-b flex flex-wrap gap-1.5 items-center ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <button className={btn} onClick={() => exec('bold')}><b>B</b></button>
              <button className={btn} onClick={() => exec('italic')}><i>I</i></button>
              <button className={btn} onClick={() => exec('underline')}><u>U</u></button>
              <button className={btn} onClick={() => exec('strikeThrough')}><s>S</s></button>
              {sep}
              <select defaultValue="" onChange={e => { exec('fontSize', e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                className={`text-sm rounded border px-1.5 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}>
                <option value="" disabled>Size</option>
                {(['1','2','3','4','5','6','7'] as const).map((s, i) => (
                  <option key={s} value={s}>{[8,10,12,14,18,24,36][i]}px</option>
                ))}
              </select>
              <select defaultValue="" onChange={e => { exec('fontName', e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                className={`text-sm rounded border px-1.5 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}>
                <option value="" disabled>Font</option>
                {['Nyala','serif','sans-serif','Arial','Times New Roman','monospace'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {sep}
              <button className={btn} onClick={() => exec('justifyLeft')}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm0 4h10v2H2zm0 4h16v2H2zm0 4h10v2H2z"/></svg>
              </button>
              <button className={btn} onClick={() => exec('justifyCenter')}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm3 4h10v2H5zm-3 4h16v2H2zm3 4h10v2H5z"/></svg>
              </button>
              <button className={btn} onClick={() => exec('justifyRight')}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm6 4h10v2H8zm-6 4h16v2H2zm6 4h10v2H8z"/></svg>
              </button>
              {sep}
              <label className={`${btn} cursor-pointer flex items-center gap-1`} title="Text Color">
                <span className="text-xs font-bold">A</span>
                <input type="color" className="w-5 h-4 cursor-pointer p-0 border-0 bg-transparent" onChange={e => exec('foreColor', e.target.value)} />
              </label>
              <label className={`${btn} cursor-pointer flex items-center gap-1`} title="Highlight">
                <span className="text-xs">H</span>
                <input type="color" className="w-5 h-4 cursor-pointer p-0 border-0 bg-transparent" onChange={e => exec('hiliteColor', e.target.value)} />
              </label>
              {sep}
              <button className={btn} onClick={() => exec('undo')}>↩</button>
              <button className={btn} onClick={() => exec('redo')}>↪</button>
            </div>

            {/* Content */}
            <div className={`p-6 sm:p-10 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              style={{ fontFamily: "'Nyala','Ethiopic',serif", fontSize: '14px', lineHeight: '1.9' }}>

              {/* ── Letter top (rich text) ── */}
              <div
                ref={topRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => { lastFocused.current = topRef.current; }}
                onInput={() => setHasChanges(true)}
                className={`outline-none mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                spellCheck={false}
                dangerouslySetInnerHTML={{ __html: `<p>ለአዋሽ &nbsp;ኢንተርናሽናል ባንክ ሰሚት ቅርንጫፍ</p>
<p>ጉዳዩ፡- የሰራተኞች ደሞዝ እንዲከፈላቸው ስለመጠየቅይመለከታል፡፡</p>
<p>ከላይ በርዕሱ ለመግለጽ እንደተሞከረው ድርጅታችን የኔሙሉ ትሬዲንግ ኃ.የተ.የግ .ማ. (ብሉ ላይት &nbsp;አካዳሚ)</p>
<p>በስሩ ላሉት ሰራተኞች ጠቅላላ &nbsp;ደመወዝ &nbsp; ከድርጅቱ አካውንት ሒሳብ ቁጥር 013251373973500</p>
<p>ብር <strong id="total-display">${totalFormatted}</strong> ተቀናሽ ተደርጎ እንዲከፈላቸው እያሳሰብኩ ስማቸውንም ከዚህ በታች እገልጻለሁ፡፡</p>` }}
              />

              {/* ── Total badge ── */}
              <div className={`mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-blue-900/40 text-blue-200 border border-blue-700' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ጠቅላላ ደሞዝ: <span className="font-mono">ብር {totalFormatted}</span>
                {salaryColIdx === -1 && <span className="text-xs font-normal opacity-70">(salary column removed)</span>}
              </div>

              {/* ── Table title ── */}
              <p className="text-center font-bold mb-3">ወርሃዊ &nbsp;የሰራተኞች ደሞዝ</p>

              {/* ── Table ── */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
                      {columns.map((col, ci) => (
                        <th key={ci} className={`border px-3 py-2 text-center relative group ${isDark ? 'border-gray-600' : 'border-gray-400'}`}>
                          <div className="flex items-center justify-center gap-1">
                            <input
                              value={col}
                              onChange={e => updateColumnHeader(ci, e.target.value)}
                              className={`text-center font-semibold bg-transparent outline-none w-full min-w-[60px] ${isDark ? 'text-gray-100' : 'text-gray-800'}`}
                            />
                            <button
                              onClick={() => deleteColumn(ci)}
                              title="Remove column"
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 rounded bg-red-500 hover:bg-red-600 text-white flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </th>
                      ))}
                      {/* delete row col header placeholder */}
                      <th className={`border px-2 py-2 w-8 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-400 bg-gray-100'}`} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className={`group ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} className={`border px-2 py-1.5 ${isDark ? 'border-gray-600' : 'border-gray-400'}`}>
                            <input
                              value={cell}
                              onChange={e => updateCell(row.id, ci, e.target.value)}
                              className={inputCls}
                            />
                          </td>
                        ))}
                        <td className={`border px-1 py-1.5 text-center ${isDark ? 'border-gray-600' : 'border-gray-400'}`}>
                          <button
                            onClick={() => deleteRow(row.id)}
                            title="Remove row"
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded bg-red-500 hover:bg-red-600 text-white flex items-center justify-center mx-auto">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              <button
                onClick={addRow}
                className={`mt-3 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Row
              </button>

              {/* ── Letter bottom (rich text) ── */}
              <div
                ref={bottomRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => { lastFocused.current = bottomRef.current; }}
                onInput={() => setHasChanges(true)}
                className={`outline-none mt-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                spellCheck={false}
                dangerouslySetInnerHTML={{ __html: `<p>አመልካች &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ----------------------</p>
<p>ቀን &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -----------------------</p>
<p>ፊርማ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -----------------------</p>` }}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
