import { Check, TriangleAlert, X } from 'lucide-react'
import type { MatchReason } from '@shared/types'

export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? 'badge-success'
      : score >= 70
        ? 'badge-success'
        : score >= 50
          ? 'badge-warning'
          : 'badge-danger'
  return (
    <span className={`badge ${tone} numeric`}>
      {score.toLocaleString('ar-EG')}%
    </span>
  )
}

export function MatchReasons({ reasons }: { reasons: MatchReason[] }) {
  if (!reasons.length) return null
  return (
    <ul className="mt-3 space-y-1 text-xs">
      {reasons.map((r, i) => (
        <li key={i} className="flex items-start gap-1.5 text-gray-600">
          {r.kind === 'match' && <Check className="w-4 h-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />}
          {r.kind === 'warn' && <TriangleAlert className="w-4 h-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden="true" />}
          {r.kind === 'conflict' && <X className="w-4 h-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden="true" />}
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  )
}
