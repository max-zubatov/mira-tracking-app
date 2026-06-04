'use client'

import { FIT_LABELS, FitScore } from '@/lib/types'

const COLORS: Record<number, string> = {
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-lime-500',
  5: 'bg-emerald-500',
}

interface FitScaleProps {
  value: FitScore
  onChange?: (v: FitScore) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

export default function FitScale({ value, onChange, readonly = false, size = 'md' }: FitScaleProps) {
  const dotSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {([1, 2, 3, 4, 5] as FitScore[]).map((n) => (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(n)}
            title={FIT_LABELS[n]}
            className={`${dotSize} rounded-full border-2 transition-all ${
              n <= value
                ? `${COLORS[value]} border-transparent`
                : 'bg-slate-100 border-slate-200'
            } ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${
        value >= 4 ? 'text-emerald-600' :
        value === 3 ? 'text-yellow-600' :
        'text-red-500'
      }`}>
        {FIT_LABELS[value]}
      </span>
    </div>
  )
}
