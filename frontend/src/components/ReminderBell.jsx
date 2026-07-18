import { useState, useRef, useEffect } from 'react'
import { Bell, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getTasks } from '../api/tasks'
import { isToday, isPast, parseISO, format } from 'date-fns'

export default function ReminderBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const btnRef   = useRef(null)
  const navigate = useNavigate()

  const { data: { reminders, dueSoon, totalCount } = { reminders: [], dueSoon: [], totalCount: 0 } } = useQuery({
    queryKey: ['reminders'],
    queryFn: getTasks,
    refetchInterval: 5 * 60 * 1000,
    select: tasks => {
      const active = tasks.filter(t => !['done', 'cancelled'].includes(t.status))
      const reminders = active.filter(t =>
        t.remind_at && (isToday(parseISO(t.remind_at)) || isPast(parseISO(t.remind_at)))
      )
      const dueSoon = active.filter(t =>
        t.due_date && (isToday(parseISO(t.due_date)) || isPast(parseISO(t.due_date)))
      )
      const allIds = new Set([...reminders.map(t => t.id), ...dueSoon.map(t => t.id)])
      return { reminders, dueSoon, totalCount: allIds.size }
    },
  })

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (!panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function goToTask(task) {
    setOpen(false)
    navigate(`/tasks?project=${task.project_id}&open=${task.id}`)
  }

  const hasDue      = dueSoon.length > 0
  const hasReminder = reminders.length > 0
  const hasAny      = totalCount > 0

  const bellColor   = hasDue ? 'text-rose-400' : hasReminder ? 'text-amber-400' : 'text-zinc-500'
  const borderColor = hasDue ? 'border-rose-500/40 hover:border-rose-400' : hasReminder ? 'border-amber-500/40 hover:border-amber-400' : 'border-zinc-700 hover:border-zinc-600'
  const pingColor   = hasDue ? 'bg-rose-400/20' : 'bg-amber-400/20'
  const badgeBg     = hasDue ? 'bg-rose-400' : 'bg-amber-400'

  return (
    <div className="fixed top-3.5 right-4 z-50">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Reminders & Due Soon"
        className={`relative p-2 rounded-full border transition-colors ${hasAny ? 'bg-zinc-800' : 'bg-zinc-900'} ${borderColor}`}
      >
        <Bell size={15} className={bellColor} />

        {hasAny && (
          <>
            <span className={`absolute inset-0 rounded-full animate-ping pointer-events-none ${pingColor}`} />
            <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full ${badgeBg} text-zinc-900 text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none`}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
            <Bell size={12} className={bellColor} />
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              {totalCount} Alert{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto">

            {/* Due Soon section */}
            {dueSoon.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/5 border-b border-rose-500/10">
                  <Clock size={10} className="text-rose-400" />
                  <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Due Today / Overdue</span>
                </div>
                {dueSoon.map(task => (
                  <button
                    key={`due-${task.id}`}
                    onClick={() => goToTask(task)}
                    className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-zinc-800/70 transition-colors border-b border-zinc-800/40 last:border-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-600">#{task.id}</span>
                      <span className="text-[12.5px] text-zinc-200 truncate flex-1">{task.title}</span>
                    </div>
                    <span className="text-[10px] text-rose-400 flex items-center gap-1">
                      <Clock size={9} />
                      Due {format(parseISO(task.due_date), 'MMM d')}
                      {isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && ' (overdue)'}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Reminders section */}
            {reminders.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/5 border-b border-amber-500/10">
                  <Bell size={10} className="text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Reminders</span>
                </div>
                {reminders.map(task => (
                  <button
                    key={`rem-${task.id}`}
                    onClick={() => goToTask(task)}
                    className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-zinc-800/70 transition-colors border-b border-zinc-800/40 last:border-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-600">#{task.id}</span>
                      <span className="text-[12.5px] text-zinc-200 truncate flex-1">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <Bell size={9} />
                        {format(parseISO(task.remind_at), 'MMM d')}
                      </span>
                      {task.due_date && (
                        <span className="text-[10px] text-zinc-600">Due {format(parseISO(task.due_date), 'MMM d')}</span>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}

            {totalCount === 0 && (
              <p className="px-3 py-4 text-[12px] text-zinc-600 text-center">No alerts</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
