import { createContext, useContext, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createTimeEntry } from '../api/timeEntries'
import { snapDuration, localDateISO } from '../utils/time'

const TimerCtx = createContext(null)

// timer shape: { taskId, taskTitle, projectId, projectName, projectColor, startedAt, isBreak }

export function TimerProvider({ children }) {
  const qc = useQueryClient()

  const [timer, setTimer] = useState(() => {
    try {
      const s = localStorage.getItem('taskflow_timer')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  function persist(state) {
    setTimer(state)
    if (state) localStorage.setItem('taskflow_timer', JSON.stringify(state))
    else localStorage.removeItem('taskflow_timer')
  }

  async function logTimer(t) {
    const elapsed = Math.floor((Date.now() - new Date(t.startedAt).getTime()) / 60000)
    const snapped = snapDuration(elapsed)
    if (snapped === 0) return  // too short — discard silently

    const d = new Date(t.startedAt)
    let h = d.getHours()
    let m = Math.round(d.getMinutes() / 15) * 15
    if (m === 60) { h += 1; m = 0 }

    try {
      await createTimeEntry({
        task_id:      t.taskId ?? null,
        project_id:   t.projectId ?? null,
        date:         localDateISO(d),
        start_time:   `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        duration_min: snapped,
        note:         t.isBreak ? 'Break' : '',
        is_break:     t.isBreak,
      })
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    } catch (err) {
      console.error('Failed to log time entry:', err)
    }
  }

  async function startTask(taskInfo) {
    if (timer) await logTimer(timer)
    persist({
      taskId:       taskInfo.id,
      taskTitle:    taskInfo.title,
      projectId:    taskInfo.projectId ?? null,
      projectName:  taskInfo.projectName ?? null,
      projectColor: taskInfo.projectColor ?? null,
      startedAt:    new Date().toISOString(),
      isBreak:      false,
    })
  }

  async function startBreak() {
    if (timer) await logTimer(timer)
    persist({
      taskId:       null,
      taskTitle:    'Break',
      projectId:    null,
      projectName:  null,
      projectColor: null,
      startedAt:    new Date().toISOString(),
      isBreak:      true,
    })
  }

  async function done() {
    if (timer) await logTimer(timer)
    persist(null)
  }

  function discard() {
    persist(null)
  }

  return (
    <TimerCtx.Provider value={{ timer, startTask, startBreak, done, discard }}>
      {children}
    </TimerCtx.Provider>
  )
}

export function useTimer() {
  return useContext(TimerCtx)
}
