'use client'

import { useState } from 'react'
import React from 'react'
import Image from 'next/image'

const CLASSES = [
  'Nursery (ጀማሪ)',
  'LKG (ደረጃ 1)',
  'UKG (ደረጃ 2)',
]
const EC_YEARS = [2017, 2018, 2019, 2020]

export default function RegistrationFormPage() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [studentType, setStudentType] = useState<'new' | 'existing'>('new')
  const [submitted, setSubmitted] = useState(false)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [enNames, setEnNames] = useState({ first: '', middle: '', last: '' })
  const [enErrors, setEnErrors] = useState({ first: '', middle: '', last: '' })
  const [amNames, setAmNames] = useState({ first: '', middle: '', last: '' })
  const [amErrors, setAmErrors] = useState({ first: '', middle: '', last: '' })
  const [gender, setGender] = useState('')
  const [genderError, setGenderError] = useState('')
  const [joinedYear, setJoinedYear] = useState('')
  const [joinedYearError, setJoinedYearError] = useState('')
  const [classVal, setClassVal] = useState('')
  const [classError, setClassError] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [fatherNameError, setFatherNameError] = useState('')
  const [motherName, setMotherName] = useState('')
  const [motherNameError, setMotherNameError] = useState('')
  const [fatherPhone, setFatherPhone] = useState('')
  const [fatherPhoneError, setFatherPhoneError] = useState('')
  const [motherPhone, setMotherPhone] = useState('')
  const [motherPhoneError, setMotherPhoneError] = useState('')

  function handlePhone(value: string, set: (v: string) => void, setErr: (e: string) => void) {
    const digits = value.replace(/\D/g, '')
    if (digits.length > 10) return
    set(digits)
    if (!digits) { setErr(''); return }
    if (digits.length === 1 && digits[0] !== '0') { setErr('Phone must start with 09 or 07'); return }
    if (digits.length >= 2 && !(digits.startsWith('09') || digits.startsWith('07'))) { setErr('Phone must start with 09 or 07'); return }
    if (digits.length > 0 && digits.length < 10) { setErr(''); return }
    setErr('')
  }
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [dob, setDob] = useState('')
  const [dobError, setDobError] = useState('')

  function handleDob(value: string) {
    const parts = value.split('/')
    if (parts[2] !== undefined && parts[2].trim().length > 4) return
    setDob(value)
    if (!value.trim()) { setDobError(''); return }
    const dd = parseInt(parts[0]?.trim())
    const mm = parseInt(parts[1]?.trim())
    const yyyy = parts[2]?.trim()
    if (parts.length !== 3 || isNaN(dd) || isNaN(mm) || !yyyy) {
      setDobError('Please enter a valid date (dd / mm / yyyy)')
      return
    }
    if (String(parts[0].trim()).length > 2) { setDobError('Day must be 1 or 2 digits'); return }
    if (dd < 0 || dd > 30) { setDobError('Day must be between 0 and 30'); return }
    if (String(parts[1].trim()).length > 2) { setDobError('Month must be 1 or 2 digits'); return }
    if (mm < 0 || mm > 12) { setDobError('Month must be between 0 and 12'); return }
    if (yyyy.length !== 4) { setDobError('Year must be exactly 4 digits'); return }
    const yy = parseInt(yyyy)
    if (isNaN(yy) || yy < 2000 || yy > 2019) { setDobError('Year must be between 2000 and 2019'); return }
    setDobError('')
  }

  function handleEmail(value: string) {
    setEmail(value)
    if (!value) { setEmailError(''); return }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailError(valid ? '' : 'Please enter a valid email address')
  }

  const AMHARIC_RE = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F]/
  const ENGLISH_RE = /[A-Za-z]/

  function handleEnName(field: 'first' | 'middle' | 'last', value: string) {
    if (AMHARIC_RE.test(value)) {
      setEnErrors(prev => ({ ...prev, [field]: 'Only English letters are allowed' }))
      return
    }
    setEnNames(prev => ({ ...prev, [field]: value }))
    setEnErrors(prev => ({ ...prev, [field]: '' }))
  }

  function handleAmName(field: 'first' | 'middle' | 'last', value: string) {
    if (ENGLISH_RE.test(value)) {
      setAmErrors(prev => ({ ...prev, [field]: 'የአማርኛ ፊደላት ብቻ ይጠቀሙ' }))
      return
    }
    setAmNames(prev => ({ ...prev, [field]: value }))
    setAmErrors(prev => ({ ...prev, [field]: '' }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Submitted Successfully!</h2>
          <p className="text-blue-600 font-medium text-sm mb-3">ምዝገባዎ ተልኳል!</p>
          <p className="text-gray-400 text-sm">We will review your application and contact you soon.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 w-full py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors font-semibold text-sm"
          >
            Submit Another · ሌላ ምዝገባ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* ── HEADER ── */}
          <div className="bg-blue-700 px-8 py-8 flex flex-col items-center text-center text-white">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 shadow-lg bg-white mb-4">
              <Image src="/logo.png" alt="Bluelight Academy" fill className="object-cover" priority />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Bluelight Academy</h1>
            <p className="text-blue-200 font-semibold text-sm mt-0.5">ብሉላይት አካዳሚ</p>
            <div className="w-10 h-px bg-white/30 my-3" />
            <h2 className="text-lg font-bold">Student Registration Form</h2>
            <p className="text-blue-200 text-sm mt-0.5">የተማሪ ምዝገባ ቅጽ</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const firstErr = !enNames.first.trim() ? 'This field is required' : ''
            const middleErr = !enNames.middle.trim() ? 'This field is required' : ''
            const lastErr = !enNames.last.trim() ? 'This field is required' : ''
            setEnErrors({ first: firstErr, middle: middleErr, last: lastErr })
            const amFirstErr = !amNames.first.trim() ? 'ይህ መስክ ያስፈልጋል' : ''
            const amMiddleErr = !amNames.middle.trim() ? 'ይህ መስክ ያስፈልጋል' : ''
            const amLastErr = !amNames.last.trim() ? 'ይህ መስክ ያስፈልጋል' : ''
            setAmErrors({ first: amFirstErr, middle: amMiddleErr, last: amLastErr })
            const gErr = !gender ? 'Please select a gender' : ''
            setGenderError(gErr)
            const dobErr = !dob.trim() ? 'Date of birth is required' : dobError
            setDobError(dobErr)
            const yearErr = !joinedYear ? 'Joined year is required' : ''
            setJoinedYearError(yearErr)
            const clsErr = !classVal ? 'Class is required' : ''
            setClassError(clsErr)
            const fatherErr = !fatherName.trim() ? 'This field is required' : ''
            setFatherNameError(fatherErr)
            const motherErr = !motherName.trim() ? 'This field is required' : ''
            setMotherNameError(motherErr)
            const fPhoneErr = !fatherPhone ? 'This field is required' : fatherPhone.length < 10 ? 'Phone number must be 10 digits' : !(fatherPhone.startsWith('09') || fatherPhone.startsWith('07')) ? 'Phone must start with 09 or 07' : ''
            setFatherPhoneError(fPhoneErr)
            const mPhoneErr = !motherPhone ? 'This field is required' : motherPhone.length < 10 ? 'Phone number must be 10 digits' : !(motherPhone.startsWith('09') || motherPhone.startsWith('07')) ? 'Phone must start with 09 or 07' : ''
            setMotherPhoneError(mPhoneErr)
            if (firstErr || middleErr || lastErr || amFirstErr || amMiddleErr || amLastErr || gErr || emailError || dobErr || yearErr || clsErr || fatherErr || motherErr || fPhoneErr || mPhoneErr) return
            setSubmitted(true)
          }}>

            {/* ══ STUDENT INFORMATION ══ */}
            <SectionBar title="Student Information" sub="የተማሪው መረጃ" />

            <div className="px-6 sm:px-8 py-6 space-y-5">

              {/* Photo + Student Type */}
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Photo */}
                <div className="flex flex-col items-center gap-2 sm:w-32 flex-shrink-0">
                  <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {photoPreview
                      ? <>
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      : <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload Photo
                    </span>
                    <span className="block text-center text-xs text-gray-400 mt-1">Optional · ፎቶ</span>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </label>
                </div>

                {/* Student Type */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Student Type · የተማሪ አይነት <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {(['new', 'existing'] as const).map((type) => (
                      <label key={type} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                        studentType === type ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="studentType" value={type}
                          checked={studentType === type} onChange={() => setStudentType(type)} className="hidden" />
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          studentType === type ? 'border-blue-600' : 'border-gray-300'
                        }`}>
                          {studentType === type && <span className="w-2 h-2 rounded-full bg-blue-600 block" />}
                        </span>
                        <span>
                          <span className={`block text-sm font-semibold ${studentType === type ? 'text-blue-700' : 'text-gray-600'}`}>
                            {type === 'new' ? 'New' : 'Existing'}
                          </span>
                          <span className="block text-xs text-gray-400">{type === 'new' ? 'አዲስ' : 'ነባር'}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* English Names */}
              <RowLabel label="Name in English" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <EnglishField label="First Name" placeholder="e.g. Abebe" value={enNames.first} error={enErrors.first} onChange={v => handleEnName('first', v)} />
                <EnglishField label="Middle Name (Father's)" placeholder="e.g. Kebede" value={enNames.middle} error={enErrors.middle} onChange={v => handleEnName('middle', v)} />
                <EnglishField label="Last Name (Grand Father's)" placeholder="e.g. Tadesse" value={enNames.last} error={enErrors.last} onChange={v => handleEnName('last', v)} />
              </div>

              {/* Amharic Names */}
              <RowLabel label="ስም በአማርኛ" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AmharicField label="የተማሪው የመጀመሪያ ስም" placeholder="ለምሳሌ፡ አበበ" value={amNames.first} error={amErrors.first} onChange={v => handleAmName('first', v)} />
                <AmharicField label="የአባት ስም" placeholder="ለምሳሌ፡ ከበደ" value={amNames.middle} error={amErrors.middle} onChange={v => handleAmName('middle', v)} />
                <AmharicField label="የአያት ስም" placeholder="ለምሳሌ፡ ታደሰ" value={amNames.last} error={amErrors.last} onChange={v => handleAmName('last', v)} />
              </div>

              {/* Gender · Email · DOB — all labels same fixed height so inputs align */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Gender */}
                <div className="flex flex-col">
                  <div className="h-10 flex flex-col justify-end mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 leading-tight">
                      Gender (ፆታ) <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={e => { setGender(e.target.value); setGenderError('') }}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                        genderError ? 'border-red-400 focus:ring-red-400 text-gray-700' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent text-gray-700'
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male · ወንድ</option>
                      <option value="female">Female · ሴት</option>
                    </select>
                    <ChevronIcon />
                  </div>
                  {genderError && <p className="text-red-500 text-xs mt-1">{genderError}</p>}
                </div>

                {/* Email */}
                <div className="flex flex-col">
                  <div className="h-10 flex flex-col justify-end mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 leading-tight">
                      Email{' '}
                      <span className="text-xs font-normal text-gray-400">(Optional)</span>
                    </span>
                  </div>
                  <input type="email" placeholder="example@email.com" value={email} onChange={e => handleEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      emailError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`} />
                  {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col">
                  <div className="h-10 flex flex-col justify-end mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 leading-tight">
                      Date of Birth <span className="text-red-500">*</span>
                    </span>
                    <span className="text-xs text-gray-400 leading-tight mt-0.5">የተወለዱበት ቀን (E.C)</span>
                  </div>
                  <input type="text" placeholder="ቀን/ወር/ዓመት" value={dob} onChange={e => handleDob(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      dobError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`} />
                  {dobError && <p className="text-red-500 text-xs mt-1">{dobError}</p>}
                </div>
              </div>

              {/* Joined Year · Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Joined Year */}
                <div className="flex flex-col">
                  <div className="h-10 flex flex-col justify-end mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 leading-tight">
                      Joined Year <span className="text-red-500">*</span>
                    </span>
                    <span className="text-xs text-gray-400 leading-tight mt-0.5">ትምሕርት የጀመሩበት ዓመት</span>
                  </div>
                  <div className="relative">
                    <select
                      value={joinedYear}
                      onChange={e => { setJoinedYear(e.target.value); setJoinedYearError('') }}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer text-gray-700 ${
                        joinedYearError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    >
                      <option value="">Select Year</option>
                      {EC_YEARS.map(y => <option key={y} value={y}>{y} E.C</option>)}
                    </select>
                    <ChevronIcon />
                  </div>
                  {joinedYearError && <p className="text-red-500 text-xs mt-1">{joinedYearError}</p>}
                </div>

                {/* Class */}
                <div className="flex flex-col">
                  <div className="h-10 flex flex-col justify-end mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 leading-tight">
                      Class (ክፍል) <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={classVal}
                      onChange={e => { setClassVal(e.target.value); setClassError('') }}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer text-gray-700 ${
                        classError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    >
                      <option value="">Select Class</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronIcon />
                  </div>
                  {classError && <p className="text-red-500 text-xs mt-1">{classError}</p>}
                </div>
              </div>

              {/* Address — full width, optional */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1.5">
                  Address (አድራሻ){' '}
                  <span className="text-xs font-normal text-gray-400">(Optional)</span>
                </label>
                <input type="text" placeholder="City / Subcity / Woreda" className={inp + " py-4"} />
              </div>

            </div>

            {/* ══ PARENT INFORMATION ══ */}
            <SectionBar title="Parent Information" sub="የወላጅ መረጃ" />

            <div className="px-6 sm:px-8 py-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ValidatedField label="Father Full Name" placeholder="Enter father's full name" value={fatherName} error={fatherNameError}
                  onChange={v => {
                    if (AMHARIC_RE.test(v)) { setFatherNameError('Only English letters are allowed'); return }
                    setFatherName(v); setFatherNameError('')
                  }} />
                <ValidatedField label="Mother Full Name" placeholder="Enter mother's full name" value={motherName} error={motherNameError}
                  onChange={v => {
                    if (AMHARIC_RE.test(v)) { setMotherNameError('Only English letters are allowed'); return }
                    setMotherName(v); setMotherNameError('')
                  }} />
                <PhoneField label="Father Phone" value={fatherPhone} error={fatherPhoneError}
                  onChange={v => handlePhone(v, setFatherPhone, setFatherPhoneError)} />
                <PhoneField label="Mother Phone" value={motherPhone} error={motherPhoneError}
                  onChange={v => handlePhone(v, setMotherPhone, setMotherPhoneError)} />
              </div>
            </div>

            {/* ══ SUBMIT ══ */}
            <div className="px-6 sm:px-8 pb-8 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit Registration · ምዝገባ ያስገቡ
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Fields marked <span className="text-red-500">*</span> are required · ኮከብ ያላቸው ግዴታ ናቸው
              </p>
            </div>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5 pb-6">
          © {new Date().getFullYear()} Bluelight Academy · ብሉላይት አካዳሚ
        </p>
      </div>
    </div>
  )
}

/* ── Chevron icon for selects ── */
function ChevronIcon() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

/* ── Shared input styles ── */
const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
const sel = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"

/* ── Section bar ── */
function SectionBar({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bg-gray-50 border-y border-gray-200 px-6 sm:px-8 py-3 flex items-center gap-2">
      <div className="w-1 h-4 bg-blue-600 rounded-full flex-shrink-0" />
      <span className="text-sm font-bold text-gray-700">{title}</span>
      <span className="text-sm text-gray-400">· {sub}</span>
    </div>
  )
}

/* ── Row sub-label ── */
function RowLabel({ label }: { label: string }) {
  return <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider -mb-1">{label}</p>
}

/* ── Amharic-only validated field ── */
function AmharicField({ label, placeholder, value, error, onChange }: {
  label: string; placeholder?: string; value: string; error: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-700 mb-1.5 leading-tight">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ── English-only validated field ── */
function EnglishField({ label, placeholder, value, error, onChange }: {
  label: string; placeholder?: string; value: string; error: string; onChange: (v: string) => void
}) {
  const hasError = !!error
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-700 mb-1.5 leading-tight">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
          hasError
            ? 'border-red-400 focus:ring-red-400'
            : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
        }`}
      />
      {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ── Phone field ── */
function PhoneField({ label, value, error, onChange }: {
  label: string; value: string; error: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-700 mb-1.5 leading-tight">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="tel"
        placeholder="09XXXXXXXX or 07XXXXXXXX"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ── Generic validated field ── */
function ValidatedField({ label, placeholder, value, error, onChange, type = 'text' }: {
  label: string; placeholder?: string; value: string; error: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-700 mb-1.5 leading-tight">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ── Generic input field ── */
function Field({ label, required, placeholder, type = 'text' }: {
  label: string; required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-700 mb-1.5 leading-tight">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} placeholder={placeholder} required={required} className={inp} />
    </div>
  )
}
