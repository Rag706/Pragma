import { useState, useRef, useEffect } from 'react'
import { Bell, Clock, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getTasks } from '../api/tasks'
import { isToday, isPast, parseISO, format } from 'date-fns'

const EMPTY = { overdue: [], todayTasks: [], reminders: [] }

export default function ReminderBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const barRef   = useRef(null)
  const navigate = useNavigate()

  const { data: { overdue, todayTasks, reminders } = EMPTY } = useQuery({
    queryKey: ['reminders'],
    queryFn: getTasks,
    refetchInterval: 5 * 60 * 1000,
    select: tasks => {
      const active = tasks.filter(t => !['done', 'cancelled'].includes(t.status))
      return {
        overdue:    active.filter(t => t.due_date   && isPast(parseISO(t.due_date))    && !isToday(parseISO(t.due_date))),
        todayTasks: active.filter(t => t.due_date   && isToday(parseISO(t.due_date))),
        reminders:  active.filter(t => t.remind_at  && (isToday(parseISO(t.remind_at)) || isPast(parseISO(t.remind_at)))),
      }
    },
  })

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (!panelRef.current?.contains(e.target) && !barRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function goToTask(task) {
    setOpen(false)
    navigate(`/tasks?project=${task.project_id}&open=${task.id}`)
  }

  const hasOverdue   = overdue.length > 0
  const hasToday     = todayTasks.length > 0
  const hasReminders = reminders.length > 0
  const hasAny       = hasOverdue || hasToday || hasReminders

  // bell icon color — most urgent wins
  const bellColor = hasOverdue ? '#f87171' : hasToday ? '#fbbf24' : hasReminders ? '#a78bfa' : '#52525b'

  return (
    <div className="fixed top-3 right-4 z-50">
      {/* ── inline bar trigger ── */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        {/* ping ring when overdue */}
        {hasOverdue && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 99,
            background: 'rgba(248,113,113,.12)',
            animation: 'bell-ping 2s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <button
          ref={barRef}
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center',
            height: 30, background: '#18181b',
            border: `1px solid ${open ? '#52525b' : '#3f3f46'}`,
            borderRadius: 99, overflow: 'hidden', cursor: 'pointer',
            opacity: hasAny ? 1 : 0.4,
            transition: 'border-color .15s',
          }}
        >
          {/* bell icon cell */}
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: '100%',
            borderRight: '1px solid #27272a', flexShrink: 0,
          }}>
            <Bell size={12} color={bellColor} />
          </span>

          {/* chip: 期限切れ */}
          <Chip
            dot="#f87171"
            label="期限切れ"
            count={overdue.length}
            active={hasOverdue}
          />

          {/* chip: 今日期限 */}
          <Chip
            dot="#fbbf24"
            label="今日"
            count={todayTasks.length}
            active={hasToday}
          />

          {/* chip: リマインダー */}
          <Chip
            dot="#a78bfa"
            label="通知"
            count={reminders.length}
            active={hasReminders}
            last
          />
        </button>
      </div>

      {/* ── dropdown panel ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8,
            width: 300, background: '#18181b',
            border: '1px solid #3f3f46', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,.7)', overflow: 'hidden',
          }}
        >
          {/* overdue section */}
          {overdue.length > 0 && (
            <Section
              icon={<AlertCircle size={10} color="#f87171" />}
              label="期限切れ"
              color="#f87171"
              bg="rgba(248,113,113,.06)"
              borderColor="rgba(248,113,113,.15)"
              tasks={overdue}
              renderSub={t => `期限: ${format(parseISO(t.due_date), 'M/d')} (${Math.floor((Date.now() - parseISO(t.due_date)) / 86400000)}日超過)`}
              subColor="#f87171"
              onSelect={goToTask}
            />
          )}

          {/* today section */}
          {todayTasks.length > 0 && (
            <Section
              icon={<Clock size={10} color="#fbbf24" />}
              label="今日期限"
              color="#fbbf24"
              bg="rgba(251,191,36,.05)"
              borderColor="rgba(251,191,36,.15)"
              tasks={todayTasks}
              renderSub={() => '本日締切'}
              subColor="#fbbf24"
              onSelect={goToTask}
            />
          )}

          {/* reminders section */}
          {reminders.length > 0 && (
            <Section
              icon={<Bell size={10} color="#a78bfa" />}
              label="リマインダー"
              color="#a78bfa"
              bg="rgba(167,139,250,.05)"
              borderColor="rgba(167,139,250,.15)"
              tasks={reminders}
              renderSub={t => `通知: ${format(parseISO(t.remind_at), 'M/d')}${t.due_date ? ` · 期限: ${format(parseISO(t.due_date), 'M/d')}` : ''}`}
              subColor="#a78bfa"
              onSelect={goToTask}
            />
          )}

          {!hasAny && (
            <p style={{ padding: '16px 12px', fontSize: 12, color: '#52525b', textAlign: 'center' }}>
              通知なし
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes bell-ping {
          0%   { transform: scale(1); opacity: .6; }
          65%  { transform: scale(1.08); opacity: 0; }
          100% { transform: scale(1.08); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Chip({ dot, label, count, active, last }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '0 10px', height: '100%',
      borderRight: last ? 'none' : '1px solid #27272a',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      color: active ? dot : '#3f3f46',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: active ? dot : '#27272a',
      }} />
      {label} <strong style={{ fontWeight: 800 }}>{count}</strong>
    </span>
  )
}

function Section({ icon, label, color, bg, borderColor, tasks, renderSub, subColor, onSelect }) {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', background: bg,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color }}>{tasks.length}</span>
      </div>
      {tasks.map(task => (
        <button
          key={task.id}
          onClick={() => onSelect(task)}
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 3,
            padding: '9px 12px', textAlign: 'left', cursor: 'pointer',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid #27272a',
            transition: 'background .12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#52525b', fontFamily: 'monospace' }}>#{task.id}</span>
            <span style={{ fontSize: 12.5, color: '#e4e4e7', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>
          </div>
          <span style={{ fontSize: 10, color: subColor }}>{renderSub(task)}</span>
        </button>
      ))}
    </>
  )
}
