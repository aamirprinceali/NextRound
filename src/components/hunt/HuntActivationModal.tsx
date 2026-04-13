import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Zap, TrendingUp, Check } from 'lucide-react'
import type { HuntSession } from '../../types'
import { getTodayIso } from '../../utils/dates'

type Step = 1 | 2 | 3

type Props = {
  open: boolean
  onClose: () => void
  onStart: (session: HuntSession) => void
  userName?: string
}

const MOTIVATIONAL = [
  "Your next role is out there. Let's go find it.",
  "Every offer starts with one application. Let's stack them.",
  "You're not just job hunting — you're building your future.",
  "The search is on. Prospect has your back.",
]

export function HuntActivationModal({ open, onClose, onStart, userName }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<'active' | 'casual'>('active')
  const [targetRole, setTargetRole] = useState('')
  const [targetSalary, setTargetSalary] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState(10)
  const [launched, setLaunched] = useState(false)

  const motivational = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]

  function handleLaunch() {
    const session: HuntSession = {
      id: `hunt-${Date.now()}`,
      startedAt: getTodayIso(),
      mode,
      targetRole,
      targetSalary,
      weeklyGoal: mode === 'active' ? weeklyGoal : 0,
      status: 'active',
    }
    setLaunched(true)
    setTimeout(() => {
      onStart(session)
      onClose()
      setStep(1)
      setLaunched(false)
    }, 1800)
  }

  function reset() {
    setStep(1)
    setMode('active')
    setTargetRole('')
    setTargetSalary('')
    setWeeklyGoal(10)
    setLaunched(false)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={e => { if (e.target === e.currentTarget) { reset(); onClose() } }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px',
            width: '100%',
            maxWidth: 480,
            position: 'relative',
          }}
        >
          {/* Close */}
          {!launched && (
            <button
              onClick={() => { reset(); onClose() }}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', display: 'flex', padding: 4,
              }}
            >
              <X size={18} />
            </button>
          )}

          {/* Step indicator */}
          {!launched && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              {([1, 2, 3] as Step[]).map(s => (
                <div key={s} style={{
                  height: 3, flex: 1, borderRadius: 99,
                  background: s <= step ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Mode selection ── */}
            {step === 1 && !launched && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Start a New Hunt
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                    {userName ? `Hey ${userName.split(' ')[0]}, are` : 'Are'} you actively looking or casually exploring?
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {[
                    { value: 'active' as const, label: 'Actively Looking', desc: 'Full send. Starts your hunt counter, goal tracking, and daily nudges.', icon: Zap, color: 'var(--brand)' },
                    { value: 'casual' as const, label: 'Casually Exploring', desc: 'Keeping an eye out. Tracking only — no counters or goals.', icon: TrendingUp, color: 'var(--blue)' },
                  ].map(opt => {
                    const Icon = opt.icon
                    const isSelected = mode === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setMode(opt.value)}
                        style={{
                          padding: '16px',
                          background: isSelected ? (opt.value === 'active' ? 'var(--brand-dim)' : 'var(--blue-dim)') : 'var(--surface-2)',
                          border: `1px solid ${isSelected ? (opt.value === 'active' ? 'rgba(126,232,162,0.3)' : 'rgba(96,165,250,0.3)') : 'var(--border)'}`,
                          borderRadius: 10,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          gap: 14,
                          alignItems: 'flex-start',
                          fontFamily: 'var(--font-body)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: isSelected ? opt.color : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={16} color={isSelected ? '#08090D' : 'var(--muted)'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: isSelected ? opt.color : 'var(--text)', fontSize: 14, marginBottom: 3 }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setStep(2)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    background: 'var(--brand)', border: 'none',
                    color: '#08090D', fontSize: 14, fontFamily: 'var(--font-body)',
                    fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Continue →
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Goals ── */}
            {step === 2 && !launched && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Set Your Targets
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                    These help us focus your dashboard and track your progress.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Target Role
                    </label>
                    <input
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Operations Manager"
                      style={{
                        width: '100%', padding: '10px 12px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)', fontSize: 14,
                        outline: 'none', fontFamily: 'var(--font-body)',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Target Salary
                    </label>
                    <input
                      value={targetSalary}
                      onChange={e => setTargetSalary(e.target.value)}
                      placeholder="e.g. $85,000 or $80k–$95k"
                      style={{
                        width: '100%', padding: '10px 12px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)', fontSize: 14,
                        outline: 'none', fontFamily: 'var(--font-body)',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>

                  {mode === 'active' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Weekly Application Goal
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[5, 10, 15, 20, 25].map(n => (
                          <button
                            key={n}
                            onClick={() => setWeeklyGoal(n)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 8,
                              border: `1px solid ${weeklyGoal === n ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                              background: weeklyGoal === n ? 'var(--gold-dim)' : 'var(--surface-2)',
                              color: weeklyGoal === n ? 'var(--gold)' : 'var(--text-soft)',
                              fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {n}/week
                          </button>
                        ))}
                        <input
                          type="number"
                          placeholder="Custom"
                          min={1} max={100}
                          style={{
                            width: 80, padding: '8px 10px',
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 14,
                            outline: 'none', fontFamily: 'var(--font-body)',
                          }}
                          onChange={e => setWeeklyGoal(Number(e.target.value) || weeklyGoal)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 8,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text-soft)', fontSize: 14, fontFamily: 'var(--font-body)',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 8,
                      background: 'var(--brand)', border: 'none',
                      color: '#08090D', fontSize: 14, fontFamily: 'var(--font-body)',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Continue →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Launch ── */}
            {step === 3 && !launched && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'var(--brand-dim)',
                      border: '1px solid rgba(126,232,162,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <Target size={28} color="var(--brand)" />
                  </motion.div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                    {mode === 'active' ? 'Ready to go.' : "Let's see what's out there."}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
                    {motivational}
                  </div>
                </div>

                {/* Summary */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                }}>
                  {[
                    { label: 'Mode', value: mode === 'active' ? 'Actively Looking' : 'Casually Exploring' },
                    targetRole ? { label: 'Target Role', value: targetRole } : null,
                    targetSalary ? { label: 'Target Salary', value: targetSalary } : null,
                    mode === 'active' ? { label: 'Weekly Goal', value: `${weeklyGoal} applications` } : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 0',
                      borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item!.label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item!.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 8,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text-soft)', fontSize: 14, fontFamily: 'var(--font-body)',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 8,
                      background: 'var(--brand)', border: 'none',
                      color: '#08090D', fontSize: 14, fontFamily: 'var(--font-body)',
                      fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Target size={14} />
                    {mode === 'active' ? 'Start the Hunt' : 'Start Exploring'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Launched animation ── */}
            {launched && (
              <motion.div
                key="launched"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '16px 0' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <Check size={28} color="#08090D" strokeWidth={3} />
                </motion.div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Hunt started. Let's get it.
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                  Your command center is ready.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
