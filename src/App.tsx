import { useEffect, useState } from 'react'
import './App.css'

type Stage =
  | 'Saved'
  | 'Applied'
  | 'Follow-Up Ready'
  | 'Recruiter Screen'
  | '1st Round'
  | '2nd Round'
  | 'Final Round'
  | 'Offer'
  | 'Archived'

type ArchiveReason =
  | 'Email rejection'
  | 'Rejected after recruiter screen'
  | 'Rejected after 1st round'
  | 'Rejected after final round'
  | 'Role filled'
  | 'Salary mismatch'
  | 'Withdrew'
  | 'No longer interested'
  | 'Unable to contact'
  | 'Offer declined'
  | 'Other'

type PrepStatus = 'Not started' | 'Light prep' | 'Ready'

type View = 'dashboard' | 'pipeline' | 'interviews' | 'archive' | 'roadmap'

type Application = {
  id: number
  company: string
  role: string
  source: string
  appliedOn: string
  followUpOn: string
  stage: Stage
  priority: 'High' | 'Medium' | 'Low'
  fitScore: number
  salary: string
  workStyle: string
  recruiter: string
  interviewDate: string
  interviewStage: string
  prepStatus: PrepStatus
  notes: string
  archiveReason: ArchiveReason | ''
  archiveDetail: string
}

type QuickAddForm = {
  company: string
  role: string
  source: string
  appliedOn: string
  followUpOn: string
  priority: 'High' | 'Medium' | 'Low'
  salary: string
  notes: string
}

const STORAGE_KEY = 'nextround-applications'

const stageOptions: Stage[] = [
  'Saved',
  'Applied',
  'Follow-Up Ready',
  'Recruiter Screen',
  '1st Round',
  '2nd Round',
  'Final Round',
  'Offer',
  'Archived',
]

const archiveReasonOptions: ArchiveReason[] = [
  'Email rejection',
  'Rejected after recruiter screen',
  'Rejected after 1st round',
  'Rejected after final round',
  'Role filled',
  'Salary mismatch',
  'Withdrew',
  'No longer interested',
  'Unable to contact',
  'Offer declined',
  'Other',
]

const sampleApplications: Application[] = [
  {
    id: 1,
    company: 'Headway',
    role: 'Member Support Operations Specialist',
    source: 'LinkedIn',
    appliedOn: '2026-03-19',
    followUpOn: '2026-03-26',
    stage: '1st Round',
    priority: 'High',
    fitScore: 5,
    salary: '$68k-$82k',
    workStyle: 'Remote',
    recruiter: 'Maya Thompson',
    interviewDate: '2026-03-27T11:00',
    interviewStage: '1st Round',
    prepStatus: 'Light prep',
    notes:
      'Strong fit. Need STAR stories around care coordination, escalation handling, and cross-functional process cleanup.',
    archiveReason: '',
    archiveDetail: '',
  },
  {
    id: 2,
    company: 'Accolade',
    role: 'Care Operations Coordinator',
    source: 'Indeed',
    appliedOn: '2026-03-17',
    followUpOn: '2026-03-24',
    stage: 'Follow-Up Ready',
    priority: 'High',
    fitScore: 4,
    salary: '$62k-$77k',
    workStyle: 'Remote-friendly',
    recruiter: 'Hiring team',
    interviewDate: '',
    interviewStage: 'No interview yet',
    prepStatus: 'Not started',
    notes:
      'Liked the mission and remote policy. No response yet. Good candidate for a LinkedIn follow-up to recruiter or HM.',
    archiveReason: '',
    archiveDetail: '',
  },
  {
    id: 3,
    company: 'Brightline',
    role: 'Care Navigator',
    source: 'Company Site',
    appliedOn: '2026-03-12',
    followUpOn: '2026-03-18',
    stage: 'Archived',
    priority: 'Medium',
    fitScore: 4,
    salary: '$60k-$75k',
    workStyle: 'Remote',
    recruiter: 'Sonia Patel',
    interviewDate: '',
    interviewStage: 'Rejected after recruiter screen',
    prepStatus: 'Ready',
    notes:
      'Good conversation, but they wanted deeper pediatric behavioral health experience.',
    archiveReason: 'Rejected after recruiter screen',
    archiveDetail:
      'Feedback suggested stronger direct behavioral health background was preferred.',
  },
  {
    id: 4,
    company: 'Transcarent',
    role: 'Operations Coordinator',
    source: 'ZipRecruiter',
    appliedOn: '2026-03-21',
    followUpOn: '2026-03-28',
    stage: 'Recruiter Screen',
    priority: 'High',
    fitScore: 5,
    salary: '$70k-$85k',
    workStyle: 'Remote',
    recruiter: 'Chris Alvarez',
    interviewDate: '2026-03-28T09:30',
    interviewStage: 'Recruiter Screen',
    prepStatus: 'Not started',
    notes:
      'Need to prep on why healthcare navigation matters to me and be ready to talk metrics.',
    archiveReason: '',
    archiveDetail: '',
  },
]

const emptyForm: QuickAddForm = {
  company: '',
  role: '',
  source: 'LinkedIn',
  appliedOn: getTodayIso(),
  followUpOn: addDays(getTodayIso(), 5),
  priority: 'High',
  salary: '',
  notes: '',
}

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return sampleApplications
    }

    try {
      return JSON.parse(saved) as Application[]
    } catch {
      return sampleApplications
    }
  })
  const [form, setForm] = useState<QuickAddForm>(emptyForm)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  const activeApplications = applications.filter(
    (application) => application.stage !== 'Archived',
  )
  const archivedApplications = applications.filter(
    (application) => application.stage === 'Archived',
  )
  const interviews = applications.filter((application) => application.interviewDate)
  const followUpsDue = applications.filter(
    (application) => application.stage !== 'Archived' && isDue(application.followUpOn),
  )
  const responseRate = activeApplications.length
    ? Math.round((interviews.length / activeApplications.length) * 100)
    : 0

  function updateApplication(id: number, changes: Partial<Application>) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, ...changes } : application,
      ),
    )
  }

  function handleAddApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.company.trim() || !form.role.trim()) {
      return
    }

    const newApplication: Application = {
      id: Date.now(),
      company: form.company.trim(),
      role: form.role.trim(),
      source: form.source,
      appliedOn: form.appliedOn,
      followUpOn: form.followUpOn,
      stage: 'Applied',
      priority: form.priority,
      fitScore: form.priority === 'High' ? 5 : form.priority === 'Medium' ? 4 : 3,
      salary: form.salary.trim() || 'TBD',
      workStyle: 'Unknown',
      recruiter: '',
      interviewDate: '',
      interviewStage: 'No interview yet',
      prepStatus: 'Not started',
      notes: form.notes.trim(),
      archiveReason: '',
      archiveDetail: '',
    }

    setApplications((current) => [newApplication, ...current])
    setForm(emptyForm)
    setActiveView('pipeline')
  }

  const navItems: { id: View; label: string; note: string }[] = [
    { id: 'dashboard', label: 'Dashboard', note: 'Today, stats, and momentum' },
    { id: 'pipeline', label: 'Tracked Jobs', note: 'The roles worth following up on' },
    { id: 'interviews', label: 'Interviews', note: 'Prep, timing, and round tracking' },
    { id: 'archive', label: 'Archive', note: 'Outcomes and rejection patterns' },
    { id: 'roadmap', label: 'Roadmap', note: 'What we are building next' },
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Local-first career command center</p>
          <h1>NextRound</h1>
          <p className="brand-copy">
            Track the applications worth caring about, keep interviews organized,
            and never lose the follow-up thread again.
          </p>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeView ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </button>
          ))}
        </nav>

        <section className="sidebar-card">
          <p className="section-label">Why this works</p>
          <ul className="bullet-list">
            <li>You only track high-signal jobs.</li>
            <li>Follow-ups become visible instead of forgotten.</li>
            <li>Interview prep lives next to the opportunity itself.</li>
          </ul>
        </section>
      </aside>

      <main className="workspace">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Bold / premium, command-center layout</p>
            <h2>Your follow-through system</h2>
            <p className="hero-copy">
              A focused view of jobs you actually care about, interview deadlines,
              and where each opportunity stands right now.
            </p>
          </div>
          <div className="hero-stats">
            <div>
              <span>Tracked now</span>
              <strong>{activeApplications.length}</strong>
            </div>
            <div>
              <span>Interviews booked</span>
              <strong>{interviews.length}</strong>
            </div>
            <div>
              <span>Follow-ups due</span>
              <strong>{followUpsDue.length}</strong>
            </div>
          </div>
        </section>

        <section className="quick-add card">
          <div className="card-heading">
            <div>
              <p className="section-label">Quick add</p>
              <h3>Save a role you want to stay on top of</h3>
            </div>
            <p className="muted">
              This is intentionally optimized for the handful of applications worth
              revisiting, not every mass application.
            </p>
          </div>

          <form className="quick-add-grid" onSubmit={handleAddApplication}>
            <label>
              Company
              <input
                value={form.company}
                onChange={(event) =>
                  setForm((current) => ({ ...current, company: event.target.value }))
                }
                placeholder="Headway"
              />
            </label>
            <label>
              Role
              <input
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
                placeholder="Operations Specialist"
              />
            </label>
            <label>
              Source
              <select
                value={form.source}
                onChange={(event) =>
                  setForm((current) => ({ ...current, source: event.target.value }))
                }
              >
                <option>LinkedIn</option>
                <option>Indeed</option>
                <option>ZipRecruiter</option>
                <option>Company Site</option>
                <option>Referral</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Applied on
              <input
                type="date"
                value={form.appliedOn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, appliedOn: event.target.value }))
                }
              />
            </label>
            <label>
              Follow up on
              <input
                type="date"
                value={form.followUpOn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, followUpOn: event.target.value }))
                }
              />
            </label>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as QuickAddForm['priority'],
                  }))
                }
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label>
              Salary target
              <input
                value={form.salary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, salary: event.target.value }))
                }
                placeholder="$70k-$85k"
              />
            </label>
            <label className="full-span">
              Why this one matters
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Mission fit, comp, recruiter, or why it is worth following up on."
              />
            </label>
            <button className="primary-button" type="submit">
              Add to tracked jobs
            </button>
          </form>
        </section>

        {activeView === 'dashboard' && (
          <section className="view-grid">
            <div className="stats-grid">
              <MetricCard label="Tracked roles" value={activeApplications.length} />
              <MetricCard label="Interview conversion" value={`${responseRate}%`} />
              <MetricCard label="Archived" value={archivedApplications.length} />
              <MetricCard label="Offers" value={countByStage(applications, 'Offer')} />
            </div>

            <section className="card">
              <div className="card-heading">
                <div>
                  <p className="section-label">Today</p>
                  <h3>Need attention</h3>
                </div>
              </div>
              <div className="action-list">
                {followUpsDue.length ? (
                  followUpsDue.map((application) => (
                    <article key={application.id} className="action-item">
                      <div>
                        <strong>
                          Follow up with {application.company}
                        </strong>
                        <p>
                          {application.role} · {application.source} · due{' '}
                          {formatDate(application.followUpOn)}
                        </p>
                      </div>
                      <span className="pill warning">Due now</span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No follow-ups are due yet.</p>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-heading">
                <div>
                  <p className="section-label">Upcoming</p>
                  <h3>Interview prep board</h3>
                </div>
              </div>
              <div className="action-list">
                {interviews.map((application) => (
                  <article key={application.id} className="action-item">
                    <div>
                      <strong>
                        {application.company} · {application.interviewStage}
                      </strong>
                      <p>
                        {formatDateTime(application.interviewDate)} · recruiter:{' '}
                        {application.recruiter || 'TBD'}
                      </p>
                    </div>
                    <span className={`pill prep-${slugify(application.prepStatus)}`}>
                      {application.prepStatus}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeView === 'pipeline' && (
          <section className="card">
            <div className="card-heading">
              <div>
                <p className="section-label">Pipeline</p>
                <h3>Tracked jobs</h3>
              </div>
            </div>

            <div className="application-grid">
              {activeApplications.map((application) => (
                <article key={application.id} className="application-card">
                  <div className="application-topline">
                    <div>
                      <p className="company">{application.company}</p>
                      <h4>{application.role}</h4>
                    </div>
                    <span className={`pill priority-${application.priority.toLowerCase()}`}>
                      {application.priority}
                    </span>
                  </div>

                  <div className="meta-grid">
                    <span>{application.source}</span>
                    <span>{application.salary}</span>
                    <span>{application.workStyle}</span>
                    <span>Fit {application.fitScore}/5</span>
                  </div>

                  <label className="inline-control">
                    Stage
                    <select
                      value={application.stage}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          stage: event.target.value as Stage,
                          archiveReason:
                            event.target.value === 'Archived'
                              ? application.archiveReason || 'Other'
                              : '',
                        })
                      }
                    >
                      {stageOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <div className="timeline-row">
                    <div>
                      <span className="meta-label">Applied</span>
                      <strong>{formatDate(application.appliedOn)}</strong>
                    </div>
                    <div>
                      <span className="meta-label">Follow up</span>
                      <strong>{formatDate(application.followUpOn)}</strong>
                    </div>
                    <div>
                      <span className="meta-label">Prep</span>
                      <select
                        value={application.prepStatus}
                        onChange={(event) =>
                          updateApplication(application.id, {
                            prepStatus: event.target.value as PrepStatus,
                          })
                        }
                      >
                        <option>Not started</option>
                        <option>Light prep</option>
                        <option>Ready</option>
                      </select>
                    </div>
                  </div>

                  <label className="inline-control">
                    Notes
                    <textarea
                      value={application.notes}
                      onChange={(event) =>
                        updateApplication(application.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'interviews' && (
          <section className="card">
            <div className="card-heading">
              <div>
                <p className="section-label">Interviews</p>
                <h3>Round tracking and prep</h3>
              </div>
            </div>

            <div className="interview-grid">
              {interviews.map((application) => (
                <article key={application.id} className="interview-card">
                  <div>
                    <p className="company">{application.company}</p>
                    <h4>{application.role}</h4>
                  </div>
                  <p className="interview-time">{formatDateTime(application.interviewDate)}</p>
                  <div className="meta-grid tight">
                    <span>{application.interviewStage}</span>
                    <span>{application.recruiter || 'Recruiter TBD'}</span>
                    <span>{application.source}</span>
                  </div>
                  <label className="inline-control">
                    Interview stage
                    <input
                      value={application.interviewStage}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          interviewStage: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="inline-control">
                    Interview date / time
                    <input
                      type="datetime-local"
                      value={application.interviewDate}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          interviewDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="inline-control">
                    Prep status
                    <select
                      value={application.prepStatus}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          prepStatus: event.target.value as PrepStatus,
                        })
                      }
                    >
                      <option>Not started</option>
                      <option>Light prep</option>
                      <option>Ready</option>
                    </select>
                  </label>
                  <label className="inline-control">
                    Recruiter / interviewer
                    <input
                      value={application.recruiter}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          recruiter: event.target.value,
                        })
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'archive' && (
          <section className="card">
            <div className="card-heading">
              <div>
                <p className="section-label">Archive</p>
                <h3>Understand why roles closed out</h3>
              </div>
            </div>

            <div className="archive-grid">
              {archivedApplications.map((application) => (
                <article key={application.id} className="archive-card">
                  <div className="application-topline">
                    <div>
                      <p className="company">{application.company}</p>
                      <h4>{application.role}</h4>
                    </div>
                    <span className="pill archived">Archived</span>
                  </div>

                  <label className="inline-control">
                    Outcome
                    <select
                      value={application.archiveReason}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          archiveReason: event.target.value as ArchiveReason,
                        })
                      }
                    >
                      {archiveReasonOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="inline-control">
                    Why it closed out
                    <textarea
                      value={application.archiveDetail}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          archiveDetail: event.target.value,
                        })
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'roadmap' && (
          <section className="card roadmap-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Project memory</p>
                <h3>Captured in a single roadmap file</h3>
              </div>
            </div>
            <p className="muted">
              The live notes for this project live in
              <code> docs/master-roadmap.md </code>
              so we can keep features, automations, and design ideas in one place.
            </p>
            <div className="roadmap-preview">
              <div>
                <strong>V1</strong>
                <p>Dashboard, tracked jobs, interviews, archive reasons, local storage.</p>
              </div>
              <div>
                <strong>Next</strong>
                <p>Calendar sync, email parsing, browser helper, reminders, search import.</p>
              </div>
              <div>
                <strong>Later</strong>
                <p>Multi-user accounts, cloud sync, desktop app packaging, public launch.</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function formatDate(date: string) {
  if (!date) {
    return 'TBD'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

function formatDateTime(date: string) {
  if (!date) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function isDue(date: string) {
  if (!date) {
    return false
  }

  const today = new Date()
  const target = new Date(date)
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  return target <= today
}

function countByStage(applications: Application[], stage: Stage) {
  return applications.filter((application) => application.stage === stage).length
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

export default App
