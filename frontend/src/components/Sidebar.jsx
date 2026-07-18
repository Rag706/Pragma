import { useState } from 'react'
import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ListTodo, FolderKanban, LayoutGrid, Zap, Settings, ChevronLeft, ChevronRight, Clock as TimeIcon, CalendarClock, Inbox } from 'lucide-react'
import { getProjects } from '../api/projects'
import { getTasks } from '../api/tasks'
import { parseISO, isToday, isPast } from 'date-fns'

const TRAY_PROJECT_ID = 11

export default function Sidebar() {
  const { data: allProjects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const trayProject = allProjects.find(p => p.id === TRAY_PROJECT_ID) ?? null
  const projects    = allProjects.filter(p => p.id !== TRAY_PROJECT_ID)
  const { data: allTasks  = [] } = useQuery({ queryKey: ['tasks'],    queryFn: getTasks, staleTime: 60_000 })

  // Per-project alert counts (uses cached allTasks — no extra network call)
  const projectAlerts = Object.fromEntries(projects.map(p => {
    const pActive  = allTasks.filter(t => t.project_id === p.id && !['done', 'cancelled'].includes(t.status))
    const overdue  = pActive.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length
    const dueToday = pActive.filter(t => t.due_date && isToday(parseISO(t.due_date))).length
    return [p.id, { overdue, dueToday }]
  }))

  const globalOverdue = Object.values(projectAlerts).reduce((s, a) => s + a.overdue, 0)

  const navigate       = useNavigate()
  const location       = useLocation()
  const [searchParams] = useSearchParams()
  const activeProjectId = location.pathname === '/tasks' ? searchParams.get('project') : null
  const onSettings      = location.pathname === '/settings'

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('taskflow_sidebar_collapsed') === 'true'
  )

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('taskflow_sidebar_collapsed', String(next))
  }

  const navBase   = `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : ''}`
  const navActive = 'bg-zinc-800 text-zinc-100'
  const navIdle   = 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
  const navClass  = ({ isActive }) => `${navBase} ${isActive ? navActive : navIdle}`

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-56'} shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 overflow-hidden`}
    >
      {/* Logo row */}
      <div className={`h-14 flex items-center border-b border-zinc-800 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-indigo-400 fill-indigo-400" />
            <span className="font-bold text-zinc-100 tracking-tight text-base">TaskFlow</span>
          </div>
        )}
        {collapsed && <Zap size={18} className="text-indigo-400 fill-indigo-400" />}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${collapsed ? 'mt-0' : ''}`}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <NavLink to="/dashboard" className={navClass} end title={collapsed ? 'Dashboard' : undefined}>
          <LayoutDashboard size={15} className="shrink-0" />
          {!collapsed && 'Dashboard'}
        </NavLink>

        <NavLink to="/today" className={navClass} title={collapsed ? 'Today' : undefined}>
          <CalendarClock size={15} className="shrink-0" />
          {!collapsed && <><span className="flex-1">Today</span>{globalOverdue > 0 && <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-rose-950 text-rose-400 border border-rose-900 shrink-0 animate-pulse">{globalOverdue}</span>}</>}
        </NavLink>

        <NavLink
          to="/tasks"
          end
          className={({ isActive }) => `${navBase} ${isActive && !activeProjectId ? navActive : navIdle}`}
          title={collapsed ? 'All Tasks' : undefined}
        >
          <ListTodo size={15} className="shrink-0" />
          {!collapsed && 'All Tasks'}
        </NavLink>

        <NavLink to="/kanban" className={navClass} title={collapsed ? 'Kanban' : undefined}>
          <LayoutGrid size={15} className="shrink-0" />
          {!collapsed && 'Kanban'}
        </NavLink>

        <NavLink to="/projects" className={navClass} title={collapsed ? 'Projects' : undefined}>
          <FolderKanban size={15} className="shrink-0" />
          {!collapsed && 'Projects'}
        </NavLink>

        <NavLink to="/timelog" className={navClass} title={collapsed ? 'Time Log' : undefined}>
          <TimeIcon size={15} className="shrink-0" />
          {!collapsed && 'Time Log'}
        </NavLink>

        {/* Tray — dedicated quick-capture nav item */}
        {!collapsed && trayProject && (
          <div className="pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Quick Capture
            </p>
            <Link
              to={`/tasks?project=${TRAY_PROJECT_ID}`}
              className={`${navBase} ${activeProjectId === String(TRAY_PROJECT_ID) ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-900/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'}`}
            >
              <Inbox size={15} className="shrink-0" />
              <span className="flex-1 truncate">Tray</span>
            </Link>
          </div>
        )}
        {collapsed && trayProject && (
          <div className="pt-3">
            <Link
              to={`/tasks?project=${TRAY_PROJECT_ID}`}
              title="Tray"
              className={`flex justify-center py-2 rounded-lg transition-colors relative ${
                activeProjectId === String(TRAY_PROJECT_ID) ? 'bg-indigo-950/60' : 'hover:bg-zinc-800/60'
              }`}
            >
              <Inbox size={15} className={activeProjectId === String(TRAY_PROJECT_ID) ? 'text-indigo-300' : 'text-zinc-500'} />
            </Link>
          </div>
        )}

        {/* Project quick links — hidden when collapsed */}
        {!collapsed && projects.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Projects
            </p>
            {projects.map(p => {
              const alert = projectAlerts[p.id] ?? { overdue: 0, dueToday: 0 }
              return (
                <Link
                  key={p.id}
                  to={`/tasks?project=${p.id}`}
                  className={`${navBase} ${activeProjectId === String(p.id) ? navActive : navIdle}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate flex-1">{p.name}</span>
                  {alert.overdue > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-rose-950 text-rose-400 border border-rose-900 shrink-0">
                      {alert.overdue}
                    </span>
                  )}
                  {alert.overdue === 0 && alert.dueToday > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/60 shrink-0">
                      {alert.dueToday}
                    </span>
                  )}
                  {alert.overdue === 0 && alert.dueToday === 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 shrink-0">✓</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* Collapsed: project color dots only */}
        {collapsed && projects.length > 0 && (
          <div className="pt-3 space-y-0.5">
            {projects.map(p => {
              const alert = projectAlerts[p.id] ?? { overdue: 0, dueToday: 0 }
              return (
                <Link
                  key={p.id}
                  to={`/tasks?project=${p.id}`}
                  title={`${p.name}${alert.overdue > 0 ? ` — ${alert.overdue} overdue` : alert.dueToday > 0 ? ` — ${alert.dueToday} due today` : ''}`}
                  className={`flex justify-center py-2 rounded-lg transition-colors relative ${
                    activeProjectId === String(p.id) ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {alert.overdue > 0 && (
                    <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                  {alert.overdue === 0 && alert.dueToday > 0 && (
                    <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </Link>
              )
            })}
          </div>
        )}

      </nav>

      {/* Footer: settings */}
      <div className="p-3 border-t border-zinc-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && <p className="text-[10px] text-zinc-600">TaskFlow v1.0</p>}
          <button
            onClick={() => navigate('/settings')}
            title="Settings"
            className={`p-1.5 rounded-md transition-colors ${
              onSettings ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Settings size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
