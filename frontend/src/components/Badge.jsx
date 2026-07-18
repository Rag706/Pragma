import clsx from 'clsx'

export const STATUS_CONFIG = {
  // ── Main workflow ──────────────────────────────────────────────────
  backlog:     { label: 'Backlog',     ring: 'ring-zinc-700',    dot: 'bg-zinc-600',    text: 'text-zinc-500'    },
  todo:        { label: 'To Do',       ring: 'ring-zinc-600',    dot: 'bg-zinc-500',    text: 'text-zinc-400'    },
  up_next:     { label: 'Up Next',     ring: 'ring-amber-500',   dot: 'bg-amber-400',   text: 'text-amber-300'   },
  planning:    { label: 'Planning',    ring: 'ring-sky-500',     dot: 'bg-sky-400',     text: 'text-sky-300'     },
  in_progress: { label: 'In Progress', ring: 'ring-indigo-500',  dot: 'bg-indigo-400',  text: 'text-indigo-300'  },
  review:      { label: 'Review',      ring: 'ring-violet-500',  dot: 'bg-violet-400',  text: 'text-violet-300'  },
  testing:     { label: 'Testing',     ring: 'ring-cyan-500',    dot: 'bg-cyan-400',    text: 'text-cyan-300'    },
  done:        { label: 'Done',        ring: 'ring-emerald-500', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  // ── Side states ────────────────────────────────────────────────────
  blocked:     { label: 'Blocked',     ring: 'ring-rose-500',    dot: 'bg-rose-400',    text: 'text-rose-300'    },
  on_hold:     { label: 'On Hold',     ring: 'ring-amber-500',   dot: 'bg-amber-400',   text: 'text-amber-300'   },
  waiting:     { label: 'Waiting',     ring: 'ring-orange-500',  dot: 'bg-orange-400',  text: 'text-orange-300'  },
  cancelled:   { label: 'Cancelled',   ring: 'ring-zinc-800',    dot: 'bg-zinc-700',    text: 'text-zinc-600'    },
}

// Grouped options for <select> dropdowns (use with <optgroup>)
export const STATUS_GROUPS = [
  {
    label: 'Status',
    options: [
      { value: 'todo',        label: 'To Do'       },
      { value: 'up_next',     label: 'Up Next'     },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'review',      label: 'Review'      },
      { value: 'testing',     label: 'Testing'     },
      { value: 'waiting',     label: 'Waiting'     },
      { value: 'on_hold',     label: 'On Hold'     },
      { value: 'done',        label: 'Done'        },
      { value: 'cancelled',   label: 'Cancelled'   },
    ],
  },
]

export const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'text-red-400',    dot: 'bg-red-500'     },
  medium: { label: 'Medium', color: 'text-amber-400',  dot: 'bg-amber-500'   },
  low:    { label: 'Low',    color: 'text-emerald-400',dot: 'bg-emerald-500' },
}

export function StatusBadge({ status, statusNote }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', cfg.text)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
        {cfg.label}
      </span>
      {statusNote && (
        <span className="text-[10px] text-zinc-500 pl-3 leading-tight">{statusNote}</span>
      )}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', cfg.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

export function ProjectDot({ color, name }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 max-w-[120px]">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  )
}
