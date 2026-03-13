'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DEPARTMENTS, POSITIONS, WORK_TYPES } from '@kintai/shared'

export default function RegisterPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // ── フォーム State ──────────────────────────────
  const [form, setForm] = useState({
    lastName:    '',
    firstName:   '',
    lastNameKana:'',
    firstNameKana:'',
    email:       '',
    password:    '',
    confirmPw:   '',
    phone:       '',
    department:  '',
    position:    '',
    workType:    '',
    joinDate:    '',
  })
  const [avatar, setAvatar]     = useState<string|null>(null)
  const [step, setStep]         = useState(1) // 1=入力, 2=確認, 3=完了
  const [errors, setErrors]     = useState<Record<string,string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (key: string, val: string) =>
    setForm(p => ({ ...p, [key]: val }))

  // ── バリデーション ────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string,string> = {}
    if (!form.lastName.trim())     e.lastName    = '姓を入力してください'
    if (!form.firstName.trim())    e.firstName   = '名を入力してください'
    if (!form.email.trim())        e.email       = 'メールアドレスを入力してください'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                    e.email       = '有効なメールアドレスを入力してください'
    if (!form.password)            e.password    = 'パスワードを入力してください'
    else if (form.password.length < 8)
                                    e.password    = 'パスワードは8文字以上にしてください'
    if (form.password !== form.confirmPw)
                                    e.confirmPw   = 'パスワードが一致しません'
    if (!form.department)          e.department  = '部署を選択してください'
    if (!form.joinDate)            e.joinDate    = '入社日を入力してください'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validate()) setStep(2)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastName: form.lastName,
          firstName: form.firstName,
          lastNameKana: form.lastNameKana,
          firstNameKana: form.firstNameKana,
          email: form.email,
          password: form.password,
          phone: form.phone,
          department: form.department,
          position: form.position,
          workType: form.workType,
          joinDate: form.joinDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ submit: data.error || '登録に失敗しました' })
        setStep(1)
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      setStep(3)
    } catch {
      setErrors({ submit: '通信エラーが発生しました' })
      setStep(1)
      setSubmitting(false)
    }
  }

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── 完了画面 ───────────────────────────────────
  if (step === 3) {
    return (
      <div style={S.wrap}>
        <div style={{...S.box, textAlign:'center'}}>
          <div style={S.checkCircle}>✓</div>
          <div style={{fontSize:22, fontWeight:700, marginBottom:8}}>登録申請を受け付けました</div>
          <div style={{fontSize:13, color:'var(--t2)', marginBottom:6, lineHeight:1.7}}>
            管理者の承認後にログインが可能になります。
          </div>
          <div style={{fontSize:12, color:'var(--t3)', marginBottom:28, lineHeight:1.6}}>
            承認されると、登録したメールアドレスに<br/>通知が届きます。
          </div>
          <button style={S.primaryBtn} onClick={() => router.push('/login')}>
            ログイン画面に戻る
          </button>
        </div>
      </div>
    )
  }

  // ── 確認画面 ───────────────────────────────────
  if (step === 2) {
    const rows = [
      ['氏名',         `${form.lastName} ${form.firstName}`],
      ['フリガナ',     `${form.lastNameKana} ${form.firstNameKana}`],
      ['メールアドレス', form.email],
      ['電話番号',     form.phone || '未入力'],
      ['部署',         form.department],
      ['役職',         form.position || '未選択'],
      ['勤務形態',     form.workType || '未選択'],
      ['入社日',       form.joinDate],
    ]
    return (
      <div style={S.wrap}>
        <div style={S.box}>
          <div style={S.logo}>KINTAI</div>
          <div style={{fontSize:20, fontWeight:700, marginBottom:4}}>登録内容の確認</div>
          <div style={{fontSize:12, color:'var(--t2)', marginBottom:24}}>
            以下の内容で登録します。よろしいですか？
          </div>

          {/* アバター */}
          {avatar && (
            <div style={{textAlign:'center', marginBottom:20}}>
              <img src={avatar} alt="avatar" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--b2)'}}/>
            </div>
          )}

          {/* 確認テーブル */}
          <div style={S.confirmTable}>
            {rows.map(([label, val]) => (
              <div key={label} style={S.confirmRow}>
                <div style={S.confirmLabel}>{label}</div>
                <div style={S.confirmValue}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex', gap:10, marginTop:24}}>
            <button style={S.secondaryBtn} onClick={() => setStep(1)}>
              ← 修正する
            </button>
            <button
              style={{...S.primaryBtn, flex:1, opacity: submitting?0.7:1}}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '送信中...' : '登録を申請する'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 入力フォーム（Step 1）────────────────────────
  return (
    <div style={S.wrap}>
      <div style={{...S.box, maxHeight:'90vh', overflowY:'auto'}}>
        <div style={S.logo}>KINTAI</div>
        <div style={{fontSize:22, fontWeight:700, marginBottom:4}}>新規アカウント登録</div>
        <div style={{fontSize:12, color:'var(--t2)', marginBottom:28}}>
          従業員情報を入力してください
        </div>

        {/* ── プロフィール画像 ── */}
        <div style={S.section}>プロフィール画像</div>
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20}}>
          <div
            style={S.avatarPreview}
            onClick={() => fileRef.current?.click()}
          >
            {avatar
              ? <img src={avatar} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>
              : <span style={{fontSize:22,color:'var(--t3)'}}>＋</span>
            }
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>JPG / PNG（2MB以内）</div>
            <button style={S.uploadBtn} onClick={() => fileRef.current?.click()}>
              画像を選択
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatar}/>
        </div>

        {/* ── 氏名 ── */}
        <div style={S.section}>基本情報 <span style={S.required}>*必須</span></div>
        <div style={S.row2}>
          <div style={{flex:1}}>
            <label style={S.label}>姓</label>
            <input style={{...S.input, ...(errors.lastName?S.inputErr:{})}}
              value={form.lastName} onChange={e=>set('lastName',e.target.value)}
              placeholder="小田原"/>
            {errors.lastName && <div style={S.errText}>{errors.lastName}</div>}
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>名</label>
            <input style={{...S.input, ...(errors.firstName?S.inputErr:{})}}
              value={form.firstName} onChange={e=>set('firstName',e.target.value)}
              placeholder="秀哉"/>
            {errors.firstName && <div style={S.errText}>{errors.firstName}</div>}
          </div>
        </div>
        <div style={S.row2}>
          <div style={{flex:1}}>
            <label style={S.label}>セイ（カナ）</label>
            <input style={S.input}
              value={form.lastNameKana} onChange={e=>set('lastNameKana',e.target.value)}
              placeholder="オダワラ"/>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>メイ（カナ）</label>
            <input style={S.input}
              value={form.firstNameKana} onChange={e=>set('firstNameKana',e.target.value)}
              placeholder="ヒデヤ"/>
          </div>
        </div>

        {/* ── メール・パスワード ── */}
        <label style={S.label}>メールアドレス <span style={S.req}>*</span></label>
        <input style={{...S.input, ...(errors.email?S.inputErr:{})}}
          type="email" value={form.email} onChange={e=>set('email',e.target.value)}
          placeholder="example@company.com"/>
        {errors.email && <div style={S.errText}>{errors.email}</div>}

        <div style={S.row2}>
          <div style={{flex:1}}>
            <label style={S.label}>パスワード <span style={S.req}>*</span></label>
            <input style={{...S.input, ...(errors.password?S.inputErr:{})}}
              type="password" value={form.password} onChange={e=>set('password',e.target.value)}
              placeholder="8文字以上"/>
            {errors.password && <div style={S.errText}>{errors.password}</div>}
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>パスワード確認 <span style={S.req}>*</span></label>
            <input style={{...S.input, ...(errors.confirmPw?S.inputErr:{})}}
              type="password" value={form.confirmPw} onChange={e=>set('confirmPw',e.target.value)}
              placeholder="再入力"/>
            {errors.confirmPw && <div style={S.errText}>{errors.confirmPw}</div>}
          </div>
        </div>

        {/* ── 社員情報 ── */}
        <div style={{...S.section, marginTop:8}}>社員情報</div>
        <label style={S.label}>電話番号</label>
        <input style={S.input}
          type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)}
          placeholder="090-1234-5678"/>

        <div style={S.row2}>
          <div style={{flex:1}}>
            <label style={S.label}>部署 <span style={S.req}>*</span></label>
            <select style={{...S.input,...S.select, ...(errors.department?S.inputErr:{})}}
              value={form.department} onChange={e=>set('department',e.target.value)}>
              <option value="">選択してください</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <div style={S.errText}>{errors.department}</div>}
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>役職</label>
            <select style={{...S.input,...S.select}}
              value={form.position} onChange={e=>set('position',e.target.value)}>
              <option value="">選択してください</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={S.row2}>
          <div style={{flex:1}}>
            <label style={S.label}>勤務形態</label>
            <select style={{...S.input,...S.select}}
              value={form.workType} onChange={e=>set('workType',e.target.value)}>
              <option value="">選択してください</option>
              {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>入社日 <span style={S.req}>*</span></label>
            <input style={{...S.input, ...(errors.joinDate?S.inputErr:{})}}
              type="date" value={form.joinDate} onChange={e=>set('joinDate',e.target.value)}/>
            {errors.joinDate && <div style={S.errText}>{errors.joinDate}</div>}
          </div>
        </div>

        {/* ── 注意事項 ── */}
        <div style={S.note}>
          ※ 登録後、管理者の承認が完了するまでログインできません。<br/>
          承認完了後、登録メールアドレスに通知が届きます。
        </div>

        {/* ── ボタン ── */}
        <button style={S.primaryBtn} onClick={handleNext}>
          確認画面へ →
        </button>

        <div style={S.loginLink}>
          すでにアカウントをお持ちですか？{' '}
          <span style={S.link} onClick={() => router.push('/login')}>
            ログイン
          </span>
        </div>
      </div>
    </div>
  )
}

// ── スタイル ──────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  wrap: {
    display:'flex', alignItems:'center', justifyContent:'center',
    minHeight:'100vh', background:'var(--bg)', padding:'24px 16px',
    fontFamily:"'Noto Sans JP', sans-serif", color:'var(--text)',
  },
  box: {
    width:'100%', maxWidth:440, background:'var(--s1)', border:'1px solid var(--b)',
    borderRadius:20, padding:'36px 24px 28px',
  },
  logo: {
    fontFamily:'DM Mono, monospace', fontSize:13,
    color:'var(--acc)', letterSpacing:'0.14em', marginBottom:6,
  },
  section: {
    fontSize:11, fontFamily:'DM Mono, monospace', color:'var(--acc)',
    letterSpacing:'0.06em', marginBottom:12, marginTop:4,
    borderBottom:'1px solid var(--b)', paddingBottom:6,
    display:'flex', alignItems:'center', gap:8,
  },
  required: { fontSize:9, color:'var(--red)', fontWeight:400 },
  req:      { color:'var(--red)', fontSize:10 },
  label: {
    fontSize:11, color:'var(--t2)', marginBottom:5, display:'block',
    fontFamily:'DM Mono, monospace',
  },
  input: {
    width:'100%', background:'var(--s2)', border:'1px solid var(--b2)',
    borderRadius:8, padding:'9px 12px', color:'var(--text)',
    fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box' as const,
  },
  inputErr: {
    borderColor:'var(--red)', background:'rgba(248,113,113,.04)',
  },
  select: {
    appearance:'none' as const, cursor:'pointer',
    backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%2394a3b8\'/%3E%3C/svg%3E")',
    backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center',
  },
  errText: { fontSize:10, color:'var(--red)', marginTop:-8, marginBottom:10 },
  row2: { display:'flex', gap:12 },
  avatarPreview: {
    width:64, height:64, borderRadius:'50%', flexShrink:0,
    border:'2px dashed var(--b2)', display:'flex',
    alignItems:'center', justifyContent:'center', cursor:'pointer',
    overflow:'hidden', background:'var(--s2)',
  },
  uploadBtn: {
    fontSize:11, padding:'5px 14px', borderRadius:6,
    border:'1px solid var(--b2)', background:'var(--s2)',
    color:'var(--text)', cursor:'pointer',
  },
  note: {
    fontSize:11, color:'var(--t3)', lineHeight:1.7,
    background:'var(--s2)', borderRadius:8, padding:'12px 14px',
    margin:'16px 0 20px', border:'1px solid var(--b)',
  },
  primaryBtn: {
    width:'100%', padding:13, borderRadius:11, border:0,
    background:'var(--acc)', color:'#0a0f1e', fontSize:14,
    fontWeight:700, cursor:'pointer',
  },
  secondaryBtn: {
    padding:'12px 20px', borderRadius:10, fontSize:13,
    border:'1px solid var(--b2)', background:'var(--s2)',
    color:'var(--text)', cursor:'pointer', fontWeight:600,
  },
  loginLink: {
    textAlign:'center', fontSize:12, color:'var(--t3)', marginTop:18,
  },
  link: {
    color:'var(--acc)', cursor:'pointer', fontWeight:600,
  },
  checkCircle: {
    width:64, height:64, borderRadius:'50%', margin:'0 auto 20px',
    background:'rgba(52,211,153,.12)', border:'2px solid var(--green)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:28, color:'var(--green)', fontWeight:700,
  },
  confirmTable: {
    background:'var(--s2)', borderRadius:10, border:'1px solid var(--b)',
    overflow:'hidden',
  },
  confirmRow: {
    display:'flex', padding:'10px 16px',
    borderBottom:'1px solid var(--b)', fontSize:13,
  },
  confirmLabel: {
    width:120, flexShrink:0, color:'var(--t2)', fontSize:11,
    fontFamily:'DM Mono, monospace',
  },
  confirmValue: { flex:1, fontWeight:500 },
}
