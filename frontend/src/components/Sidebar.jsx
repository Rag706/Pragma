import { useState } from 'react'
import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ListTodo, FolderKanban, LayoutGrid, Zap, Settings, ChevronLeft, ChevronRight, Clock as TimeIcon } from 'lucide-react'
import { getProjects } from '../api/projects'
import { getStats } from '../api/stats'

export default function Sidebar() {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const { data: stats }         = useQuery({ queryKey: ['stats'],    queryFn: getStats })

  const taskCountMap = Object.fromEntries(
    (stats?.project_stats ?? []).map(p => [p.id, p.total - (p.done ?? 0)])
  )

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

        {/* Project quick links — hidden when collapsed */}
        {!collapsed && projects.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Projects
            </p>
            {projects.map(p => (
              <Link
                key={p.id}
                to={`/tasks?project=${p.id}`}
                className={`${navBase} ${activeProjectId === String(p.id) ? navActive : navIdle}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate flex-1">{p.name}</span>
                {taskCountMap[p.id] > 0 && (
                  <span className="text-[10px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5 leading-none shrink-0">
                    {taskCountMap[p.id]}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Collapsed: project color dots only */}
        {collapsed && projects.length > 0 && (
          <div className="pt-3 space-y-0.5">
            {projects.map(p => (
              <Link
                key={p.id}
                to={`/tasks?project=${p.id}`}
                title={p.name}
                className={`flex justify-center py-2 rounded-lg transition-colors ${
                  activeProjectId === String(p.id) ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              </Link>
            ))}
          </div>
        )}

        {/* Status shortcuts — expanded only, only show statuses with tasks */}
        {!collapsed && stats && (() => {
          const k = stats.kpis
          const shortcuts = [
            { status: 'blocked',     label: 'Blocked',     count: k.blocked,     color: '#fb7185' },
            { status: 'review',      label: 'In Review',   count: k.review,      color: '#a78bfa' },
            { status: 'testing',     label: 'Testing',     count: k.testing,     color: '#22d3ee' },
            { status: 'in_progress', label: 'In Progress', count: k.in_progress, color: '#818cf8' },
          ].filter(s => s.count > 0)

          if (!shortcuts.length) return null
          const activeStatus = location.pathname === '/tasks' ? searchParams.get('status') : null

          return (
            <div className="pt-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Focus
              </p>
              {shortcuts.map(s => (
                <Link
                  key={s.status}
                  to={`/tasks?status=${s.status}`}
                  className={`${navBase} ${activeStatus === s.status ? navActive : navIdle}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate flex-1">{s.label}</span>
                  <span className="text-[10px] rounded-full px-1.5 py-0.5 leading-none shrink-0 font-semibold"
                    style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                    {s.count}
                  </span>
                </Link>
              ))}
            </div>
          )
        })()}
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
