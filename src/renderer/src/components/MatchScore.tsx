import type { MatchReason } from '@shared/types'

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? 'bg-green-100 text-green-800'
      : score >= 70
        ? 'bg-emerald-100 text-emerald-800'
        : score >= 50
          ? 'bg-amber-100 text-amber-800'
          : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${color}`}>
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
          {r.kind === 'match' && <span className="text-green-600 font-bold">✓</span>}
          {r.kind === 'warn' && <span className="text-amber-500 font-bold">△</span>}
          {r.kind === 'conflict' && <span className="text-red-500 font-bold">✗</span>}
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  )
}
