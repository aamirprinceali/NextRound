import type { MainStage, SubStage } from '../types'

// Maps old 19-stage system → new 7 main stages (for localStorage migration)
type LegacyStage = string
export const LEGACY_TO_MAIN: Record<LegacyStage, MainStage> = {
  'Saved':                    'Applied',
  'Application Submitted':    'Applied',
  'Follow-Up 1':              'Applied',
  'Follow-Up 2':              'Applied',
  'Recruiter Screen':         'Screening',
  'Scheduled 1st Interview':  'Interviewing',
  'Completed 1st Interview':  'Interviewing',
  'Scheduled 2nd Interview':  'Interviewing',
  'Completed 2nd Interview':  'Interviewing',
  'Scheduled 3rd Interview':  'Interviewing',
  'Completed 3rd Interview':  'Interviewing',
  'Scheduled 4th Interview':  'Interviewing',
  'Completed 4th Interview':  'Interviewing',
  'Waiting on response':      'Deciding',
  'No response':              'Closed',
  'Offer made':               'Offer',
  'Offer accepted':           'Offer',
  'Offer declined':           'Offer',
  'Archived':                 'Closed',
}

// Sub-states available per main stage
export const SUB_STAGES: Record<MainStage, SubStage[]> = {
  Applied:      [],
  Screening:    [],
  Assessment:   ['Assessment Assigned', 'Assessment In Progress', 'Assessment Submitted'],
  Interviewing: ['Round 1', 'Round 2', 'Round 3', 'Round 4+'],
  Deciding:     ['Waiting on Decision', 'Company Interviewing Others'],
  Offer:        ['Offer Received', 'Negotiating', 'Offer Accepted', 'Offer Declined'],
  Closed:       [
    'Rejected — Application', 'Rejected — After Screening',
    'Rejected — After Round 1', 'Rejected — After Round 2',
    'Rejected — Final Round', 'Rejected — Offer Stage',
    'Ghosted', 'Withdrew', 'Role Filled', 'Salary Mismatch',
  ],
}

// Display config per main stage
export const STAGE_CONFIG: Record<MainStage, {
  color: string; bg: string; label: string; order: number
}> = {
  Applied:      { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  label: 'Applied',      order: 0 },
  Screening:    { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Screening',    order: 1 },
  Assessment:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'Assessment',   order: 2 },
  Interviewing: { color: '#7EE8A2', bg: 'rgba(126,232,162,0.12)', label: 'Interviewing', order: 3 },
  Deciding:     { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  label: 'Deciding',     order: 4 },
  Offer:        { color: '#4ADE80', bg: 'rgba(74,222,128,0.15)',  label: 'Offer',        order: 5 },
  Closed:       { color: '#5F6B7A', bg: 'rgba(95,107,122,0.12)', label: 'Closed',       order: 6 },
}

// Stages that appear in the active pipeline (In Play)
export const IN_PLAY_STAGES: MainStage[] = [
  'Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer'
]

// All stages in order
export const STAGE_ORDER: MainStage[] = [
  'Applied', 'Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer', 'Closed'
]

export function getStageBadgeStyle(stage: MainStage): React.CSSProperties {
  const cfg = STAGE_CONFIG[stage]
  return { color: cfg.color, background: cfg.bg }
}
