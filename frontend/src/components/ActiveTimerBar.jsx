import { useState, useEffect } from 'react'
import { Timer, Check, Coffee, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useTimer } from '../context/TimerContext'
import { snapDuration, formatMinutes } from '../utils/time'

function getElapsedMin(startedAt) {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
}

export default function ActiveTimerBar() {
  const { timer, done, startBreak, discard } = useTimer()
  const [elapsed, setElapsed] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!timer) return
    setElapsed(getElapsedMin(timer.startedAt))
    const id = setInterval(() => setElapsed(getElapsedMin(timer.startedAt)), 15000)
    return () => clearInterval(id)
  }, [timer?.startedAt])

  if (!timer) return null

  const snapped  = snapDuration(elapsed)
  const color    = timer.isBreak ? '#f59e0b' : (timer.projectColor || '#6366f1')
  const willLog  = snapped > 0

  if (collapsed) {
    return (
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-xs text-zinc-400 truncate max-w-[200px]">
            {timer.isBreak ? '☕ Break' : timer.taskTitle}
          </span>
          <span className="text-xs font-mono text-zinc-500">{elapsed}m</span>
          {willLog && (
            <span className="text-[10px] text-zinc-600">→ {formatMinutes(snapped)}</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ChevronDown size={13} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Pulse indicator */}
      <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">
          {timer.isBreak ? '☕  Break' : timer.taskTitle}
        </p>
        {!timer.isBreak && timer.projectName && (
          <p className="text-[10px] text-zinc-500 truncate">{timer.projectName}</p>
        )}
      </div>

      {/* Elapsed + will-log */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color }}>
          {elapsed}m
        </p>
        <p className="text-[10px] text-zinc-600">
          {willLog ? `logs as ${formatMinutes(snapped)}` : '< 10m · discarded'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0 border-l border-zinc-800 pl-3">
        {!timer.isBreak && (
          <button
            onClick={startBreak}
            title="Start lunch break — logs current task"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-amber-400
              hover:bg-amber-500/10 transition-colors"
          >
            <Coffee size={13} /> Break
          </button>
        )}
        <button
          onClick={done}
          title={timer.isBreak ? 'End break — log it' : 'Done — log this time'}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400
            hover:bg-emerald-500/10 transition-colors font-medium"
        >
          <Check size={13} /> {timer.isBreak ? 'End Break' : 'Done'}
        </button>
        <button
          onClick={discard}
          title="Discard — do not log this time"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X size={13} />
        </button>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse"
          className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-500 hover:bg-zinc-800 transition-colors"
        >
          <ChevronUp size={13} />
        </button>
      </div>
    </div>
  )
}
