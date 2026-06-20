import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RotateCcw, Keyboard, Palette, ListTodo, LayoutDashboard, Target, Database, Zap } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'
import { getTasks } from '../api/tasks'
import { STATUS_GROUPS } from '../components/Badge'

const SORT_FIELDS = [
  { value: 'status',     label: 'Status' },
  { value: 'priority',   label: 'Priority' },
  { value: 'due_date',   label: 'Due Date' },
  { value: 'title',      label: 'Title' },
  { value: 'created_at', label: 'Created' },
]

const SHORTCUTS = [
  { key: 'N',          desc: 'New task' },
  { key: 'Esc',        desc: 'Close drawer' },
  { key: 'Ctrl+Enter', desc: 'Save activity log entry' },
]

function SectionCard({ icon, title, desc, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-4">
      <div className="flex items-start gap-3 mb-5">
        <div className="mt-0.5 p-2 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-zinc-300">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-zinc-700'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function PillGroup({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === o.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, update, reset } = useSettings()
  const { theme, setTheme } = useTheme()
  const [exporting, setExporting] = useState(null)

  async function exportData(fmt) {
    setExporting(fmt)
    try {
      const tasks = await getTasks({})
      if (fmt === 'json') {
        const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
        triggerDownload(blob, 'taskflow_tasks.json')
      } else {
        const headers = ['id', 'title', 'status', 'priority', 'progress', 'project_id', 'due_date', 'notes', 'status_note', 'created_at']
        const rows = tasks.map(t =>
          headers.map(h => {
            const v = t[h] ?? ''
            const s = String(v)
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
          }).join(',')
        )
        const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
        triggerDownload(blob, 'taskflow_tasks.csv')
      }
    } finally {
      setExporting(null)
    }
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Customize how TaskFlow works for you</p>
        </div>
      </div>

      <div className="max-w-2xl">

        {/* Appearance */}
        <SectionCard icon={<Palette size={15} />} title="Appearance">
          <Row label="Theme" desc="Controls text contrast and color intensity">
            <PillGroup
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'default', label: 'Standard' },
                { value: 'bright',  label: 'High Contrast' },
              ]}
            />
          </Row>
        </SectionCard>

        {/* Task Defaults */}
        <SectionCard
          icon={<ListTodo size={15} />}
          title="Task Defaults"
          desc="Pre-filled values when opening New Task"
        >
          <Row label="Default status">
            <select
              value={settings.default_status}
              onChange={e => update('default_status', e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {STATUS_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </Row>
          <Row label="Default priority">
            <Sel
              value={settings.default_priority}
              onChange={v => update('default_priority', v)}
              options={[
                { value: 'high',   label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low',    label: 'Low' },
              ]}
            />
          </Row>
        </SectionCard>

        {/* Task List */}
        <SectionCard
          icon={<Target size={15} />}
          title="Task List"
          desc="Controls how All Tasks behaves on load"
        >
          <Row label="Default sort">
            <div className="flex gap-2">
              <Sel
                value={settings.default_sort_field}
                onChange={v => update('default_sort_field', v)}
                options={SORT_FIELDS}
              />
              <Sel
                value={settings.default_sort_dir}
                onChange={v => update('default_sort_dir', v)}
                options={[
                  { value: 'asc',  label: '↑ Ascending' },
                  { value: 'desc', label: '↓ Descending' },
                ]}
              />
            </div>
          </Row>
          <Row
            label="Hide done tasks"
            desc="Done tasks are hidden unless you filter by that status"
          >
            <Toggle value={settings.hide_done} onChange={v => update('hide_done', v)} />
          </Row>
          <Row
            label="Hide cancelled tasks"
            desc="Cancelled tasks are hidden unless you filter by that status"
          >
            <Toggle value={settings.hide_cancelled} onChange={v => update('hide_cancelled', v)} />
          </Row>
        </SectionCard>

        {/* Dashboard */}
        <SectionCard
          icon={<LayoutDashboard size={15} />}
          title="Dashboard"
        >
          <Row label="Default view" desc="Which mode opens when you go to Dashboard">
            <PillGroup
              value={settings.default_dashboard_view}
              onChange={v => update('default_dashboard_view', v)}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'focus',    label: 'Focus' },
              ]}
            />
          </Row>
        </SectionCard>

        {/* Focus Mode */}
        <SectionCard
          icon={<Zap size={15} />}
          title="Focus Mode"
          desc="Which sections to show in the Focus dashboard"
        >
          <Row label="Overdue section">
            <Toggle value={settings.focus_show_overdue}     onChange={v => update('focus_show_overdue', v)} />
          </Row>
          <Row label="Today section">
            <Toggle value={settings.focus_show_today}       onChange={v => update('focus_show_today', v)} />
          </Row>
          <Row label="Tomorrow section">
            <Toggle value={settings.focus_show_tomorrow}    onChange={v => update('focus_show_tomorrow', v)} />
          </Row>
          <Row label="In Progress section">
            <Toggle value={settings.focus_show_in_progress} onChange={v => update('focus_show_in_progress', v)} />
          </Row>
        </SectionCard>

        {/* Data */}
        <SectionCard
          icon={<Database size={15} />}
          title="Data"
          desc="Export your tasks for backup or use in other tools"
        >
          <Row label="Export as CSV" desc="Opens in Excel, Google Sheets, etc.">
            <button
              onClick={() => exportData('csv')}
              disabled={!!exporting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download size={13} />
              {exporting === 'csv' ? 'Exporting…' : 'Download CSV'}
            </button>
          </Row>
          <Row label="Export as JSON" desc="Full backup including all task fields">
            <button
              onClick={() => exportData('json')}
              disabled={!!exporting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download size={13} />
              {exporting === 'json' ? 'Exporting…' : 'Download JSON'}
            </button>
          </Row>
        </SectionCard>

        {/* Keyboard Shortcuts */}
        <SectionCard icon={<Keyboard size={15} />} title="Keyboard Shortcuts">
          <div className="space-y-1">
            {SHORTCUTS.map(s => (
              <div key={s.key} className="flex items-center justify-between py-2.5 border-b border-zinc-800/60 last:border-0">
                <span className="text-sm text-zinc-400">{s.desc}</span>
                <kbd className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono border border-zinc-700">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Reset */}
        <div className="flex justify-end pb-8">
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) reset()
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            Reset to defaults
          </button>
        </div>

      </div>
    </div>
  )
}
