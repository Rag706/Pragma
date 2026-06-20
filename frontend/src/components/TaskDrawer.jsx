import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Trash2, Calendar, Flag, Layers, AlignLeft, BarChart2, Clock, Plus, Loader2, Tag, Link2, Pencil, ExternalLink, ListChecks, ChevronDown, ChevronRight } from 'lucide-react'
import { updateTask, deleteTask } from '../api/tasks'
import { getProjects } from '../api/projects'
import { getTaskLogs, createTaskLog, deleteTaskLog } from '../api/taskLogs'
import { getProjectTags, setTaskTags } from '../api/tags'
import { getTaskLinks, createTaskLink, updateTaskLink, deleteTaskLink } from '../api/taskLinks'
import { getChecklist, createChecklistItem, updateChecklistItem, deleteChecklistItem } from '../api/checklist'
import { STATUS_CONFIG, STATUS_GROUPS, PRIORITY_CONFIG } from './Badge'
import { format, parseISO } from 'date-fns'
const PRIORITIES = Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))
const PROGRESS_STEPS = [0,10,20,30,40,50,60,70,80,90,100]

const fieldCls =
  'w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors'

export default function TaskDrawer({ task, onClose, onDeleted, noBackdrop = false }) {
  const [form, setForm] = useState(null)
  const [logText, setLogText] = useState('')
  const qc = useQueryClient()
  const logInputRef = useRef(null)

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['taskLogs', task?.id],
    queryFn: () => getTaskLogs(task.id),
    enabled: !!task?.id,
  })

  useEffect(() => {
    if (task) setForm({ ...task })
  }, [task])

  const saveMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      onDeleted?.()
      onClose()
    },
  })

  const addLogMutation = useMutation({
    mutationFn: (content) => createTaskLog(task.id, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskLogs', task.id] })
      setLogText('')
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: deleteTaskLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskLogs', task.id] }),
  })

  function saveField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    saveMutation.mutate({ id: task.id, [field]: value })
  }

  function saveFieldWithSync(field, value) {
    let extra = {}
    // Setting status to done → snap progress to 100
    if (field === 'status' && value === 'done') extra = { progress: 100 }
    // Dragging progress to 100 → mark done
    if (field === 'progress' && value === 100) extra = { status: 'done' }
    // Dragging progress below 100 when task was done → revert to in_progress
    if (field === 'progress' && value < 100 && form.status === 'done') extra = { status: 'in_progress' }
    const update = { [field]: value, ...extra }
    setForm((f) => ({ ...f, ...update }))
    saveMutation.mutate({ id: task.id, ...update })
  }

  function handleTitleBlur() {
    if (!task) return
    if (form.title !== task.title && form.title.trim())
      saveMutation.mutate({ id: task.id, title: form.title })
  }

  function handleNotesBlur() {
    if (!task) return
    if (form.notes !== task.notes)
      saveMutation.mutate({ id: task.id, notes: form.notes })
  }

  function handleStatusNoteBlur() {
    if (!task) return
    if (form.status_note !== task.status_note)
      saveMutation.mutate({ id: task.id, status_note: form.status_note })
  }

  function handleAddLog() {
    if (!logText.trim()) return
    addLogMutation.mutate(logText.trim())
  }

  function handleLogKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddLog()
  }

  const open = !!task

  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const showStatusNote = form && ['waiting', 'on_hold', 'blocked'].includes(form.status)

  return (
    <>
      {!noBackdrop && (
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 w-[420px] bg-zinc-900 border-l border-zinc-800 shadow-2xl
          flex flex-col transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {form && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <span className="text-xs text-zinc-500">
                {saveMutation.isPending ? 'Saving…' : 'Task Detail'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (task && confirm('Delete this task?')) deleteMutation.mutate(task.id) }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Title */}
              <textarea
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onBlur={handleTitleBlur}
                rows={2}
                className="w-full bg-transparent text-zinc-100 font-semibold text-base resize-none
                  focus:outline-none placeholder-zinc-600 leading-snug"
                placeholder="Task title…"
              />

              {/* Fields */}
              <div className="space-y-3">
                <Field icon={<Layers size={13} />} label="Status">
                  <select value={form.status} onChange={(e) => saveFieldWithSync('status', e.target.value)} className={fieldCls}>
                    {STATUS_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                  </select>
                </Field>

                {/* Status note — shown for waiting / on_hold */}
                {showStatusNote && (
                  <Field icon={<AlignLeft size={13} />} label="Status Note">
                    <input
                      type="text"
                      value={form.status_note ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, status_note: e.target.value }))}
                      onBlur={handleStatusNoteBlur}
                      placeholder={form.status === 'waiting' ? 'Waiting on…' : form.status === 'blocked' ? 'Blocked by…' : 'Reason for hold…'}
                      className={fieldCls}
                      maxLength={200}
                    />
                  </Field>
                )}

                {/* Progress */}
                <Field icon={<BarChart2 size={13} />} label={`Progress — ${form.progress ?? 0}%`}>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0} max={100} step={10}
                      value={form.progress ?? 0}
                      onChange={(e) => saveFieldWithSync('progress', Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${form.progress ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      {PROGRESS_STEPS.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => saveFieldWithSync('progress', v)}
                          className={`text-[10px] rounded px-0.5 transition-colors ${
                            (form.progress ?? 0) === v
                              ? 'text-indigo-300 font-semibold'
                              : 'text-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>

                <Field icon={<Flag size={13} />} label="Priority">
                  <select value={form.priority} onChange={(e) => saveField('priority', e.target.value)} className={fieldCls}>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>

                {form.project_id && (
                  <TagsField taskId={form.id} projectId={form.project_id} currentTags={form.tags ?? []} />
                )}

                <Field icon={<Layers size={13} />} label="Project">
                  <select
                    value={form.project_id ?? ''}
                    onChange={(e) => saveField('project_id', e.target.value ? Number(e.target.value) : null)}
                    className={fieldCls}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>

                <Field icon={<Calendar size={13} />} label="Due Date">
                  <input
                    type="date"
                    value={form.due_date ?? ''}
                    onChange={(e) => saveField('due_date', e.target.value || null)}
                    className={fieldCls}
                  />
                </Field>

                <Field icon={<Calendar size={13} />} label="Start Date">
                  <input
                    type="date"
                    value={form.start_date ?? ''}
                    onChange={(e) => saveField('start_date', e.target.value || null)}
                    className={fieldCls}
                  />
                </Field>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-2">
                  <AlignLeft size={13} /> Notes
                </label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  onBlur={handleNotesBlur}
                  rows={3}
                  placeholder="Add notes…"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* Checklist */}
              <ChecklistField taskId={form.id} initialItems={form.checklist_items ?? []} />

              {/* Links */}
              <LinksField taskId={form.id} initialLinks={form.links ?? []} />

              {/* Activity Log */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-2">
                  <Clock size={13} /> Activity Log
                </label>

                {/* Add entry */}
                <div className="flex gap-2 mb-3">
                  <textarea
                    ref={logInputRef}
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    onKeyDown={handleLogKeyDown}
                    rows={2}
                    placeholder="Add a log entry… (Ctrl+Enter to save)"
                    className={`${fieldCls} resize-none flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleAddLog}
                    disabled={!logText.trim() || addLogMutation.isPending}
                    className="self-start mt-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {addLogMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  </button>
                </div>

                {/* Log entries */}
                {logsLoading ? (
                  <div className="flex items-center justify-center py-4 text-zinc-600">
                    <Loader2 size={14} className="animate-spin mr-2" /> Loading…
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No activity logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="group flex gap-2 bg-zinc-800/50 rounded-lg px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            {format(parseISO(log.created_at), 'MMM d, yyyy · h:mm a')}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteLogMutation.mutate(log.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 shrink-0">
              <p className="text-[10px] text-zinc-600">
                {form.created_at ? `Created ${format(parseISO(form.created_at), 'MMM d, yyyy')}` : ''}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Field({ icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

function TagsField({ taskId, projectId, currentTags }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: projectTags = [] } = useQuery({
    queryKey: ['projectTags', projectId],
    queryFn: () => getProjectTags(projectId),
    enabled: !!projectId,
  })

  const mutation = useMutation({
    mutationFn: (tagIds) => setTaskTags(taskId, tagIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const currentIds = new Set(currentTags.map(t => t.id))

  function toggle(tagId) {
    const next = new Set(currentIds)
    if (next.has(tagId)) next.delete(tagId)
    else next.add(tagId)
    mutation.mutate([...next])
  }

  if (projectTags.length === 0 && currentTags.length === 0) return null

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
        <Tag size={13} /> Tags
      </label>

      {/* Selected tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {currentTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition-opacity hover:opacity-70"
              style={{ background: `${tag.color}25`, color: tag.color }}
              title="Click to remove"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tag.color }} />
              {tag.name}
              <span className="opacity-60 ml-0.5">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Add tag toggle */}
      {projectTags.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          <Plus size={11} />
          {open ? 'Hide tags' : 'Add tags'}
        </button>
      )}

      {/* Tag picker */}
      {open && projectTags.length > 0 && (
        <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
          {projectTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left ${
                currentIds.has(tag.id) ? 'bg-zinc-700/60' : 'hover:bg-zinc-700/40'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border"
                style={{
                  borderColor: currentIds.has(tag.id) ? tag.color : '#52525b',
                  background: currentIds.has(tag.id) ? tag.color : 'transparent',
                }}
              >
                {currentIds.has(tag.id) && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tag.color }} />
              <span className="text-zinc-200">{tag.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChecklistField({ taskId, initialItems }) {
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)
  const [newText,   setNewText]   = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText,  setEditText]  = useState('')
  const newInputRef = useRef(null)

  const { data: items = initialItems } = useQuery({
    queryKey: ['checklist', taskId],
    queryFn:  () => getChecklist(taskId),
    enabled:  !!taskId,
    initialData: initialItems,
  })

  const total = items.length
  const done  = items.filter(i => i.checked).length
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['checklist', taskId] })
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  const createMut = useMutation({
    mutationFn: (data) => createChecklistItem(taskId, data),
    onSuccess: () => { invalidate(); setNewText('') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateChecklistItem(id, data),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteChecklistItem,
    onSuccess: invalidate,
  })

  function handleAddKey(e) {
    if (e.key === 'Enter' && newText.trim()) {
      createMut.mutate({ title: newText.trim(), checked: false })
    } else if (e.key === 'Escape') {
      setNewText('')
    }
  }

  function startEdit(item) { setEditingId(item.id); setEditText(item.title) }

  function saveEdit(item) {
    if (editText.trim() && editText !== item.title) {
      updateMut.mutate({ id: item.id, title: editText.trim() })
    } else {
      setEditingId(null)
    }
  }

  function handleEditKey(e, item) {
    if (e.key === 'Enter') saveEdit(item)
    else if (e.key === 'Escape') setEditingId(null)
  }

  const barColor = pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-400 transition-colors"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          <ListChecks size={13} />
          Checklist
          {total > 0 && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full ml-0.5">
              {done}/{total}
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={() => newInputRef.current?.focus()}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <Plus size={11} /> Add item
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-zinc-500 w-7 text-right">{pct}%</span>
            </div>
          )}

          {/* Items */}
          <div className="space-y-0.5 mb-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 group transition-colors"
              >
                {/* Circle checkbox */}
                <button
                  onClick={() => updateMut.mutate({ id: item.id, checked: !item.checked })}
                  className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                    item.checked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-zinc-600 hover:border-emerald-400'
                  }`}
                >
                  {item.checked && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </button>

                {/* Title — click to edit */}
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => handleEditKey(e, item)}
                    onBlur={() => saveEdit(item)}
                    className="flex-1 bg-transparent text-sm text-zinc-100 focus:outline-none border-b border-zinc-600 pb-0.5"
                  />
                ) : (
                  <span
                    className={`flex-1 text-sm cursor-text select-none ${
                      item.checked ? 'line-through text-zinc-600' : 'text-zinc-300'
                    }`}
                    onClick={() => startEdit(item)}
                  >
                    {item.title}
                  </span>
                )}

                <button
                  onClick={() => deleteMut.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all rounded shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Add item input */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0 flex items-center justify-center">
              <Plus size={8} className="text-zinc-700" />
            </div>
            <input
              ref={newInputRef}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={handleAddKey}
              placeholder="Add an item…  (Enter to save, Esc to cancel)"
              className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </>
      )}
    </div>
  )
}

function LinksField({ taskId, initialLinks }) {
  const qc = useQueryClient()
  const [adding,    setAdding]    = useState(false)
  const [newTitle,  setNewTitle]  = useState('')
  const [newUrl,    setNewUrl]    = useState('')
  const [editId,    setEditId]    = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl,   setEditUrl]   = useState('')

  const { data: links = [] } = useQuery({
    queryKey: ['taskLinks', taskId],
    queryFn:  () => getTaskLinks(taskId),
    enabled:  !!taskId,
    initialData: initialLinks,
  })

  const createMut = useMutation({
    mutationFn: (data) => createTaskLink(taskId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['taskLinks', taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setAdding(false); setNewTitle(''); setNewUrl('')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateTaskLink(id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['taskLinks', taskId] })
      setEditId(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteTaskLink,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['taskLinks', taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  function startEdit(link) { setEditId(link.id); setEditTitle(link.title); setEditUrl(link.url) }
  function saveEdit()      { if (editTitle.trim() && editUrl.trim()) updateMut.mutate({ id: editId, title: editTitle, url: editUrl }) }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-2">
        <Link2 size={13} /> Links
      </label>

      {links.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {links.map(link => (
            editId === link.id ? (
              <div key={link.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 space-y-2">
                <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  placeholder="Title" className={fieldCls} />
                <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                  placeholder="https://…" className={fieldCls}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} />
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)}
                    className="flex-1 py-1.5 text-xs text-zinc-400 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveEdit} disabled={!editTitle.trim() || !editUrl.trim() || updateMut.isPending}
                    className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div key={link.id} className="flex items-start gap-2 group bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                <Link2 size={11} className="text-indigo-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 leading-snug">{link.title}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mt-0.5">
                    <ExternalLink size={10} className="shrink-0" />
                    <span className="truncate max-w-[240px]">{link.url}</span>
                  </a>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(link)}
                    className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => deleteMut.mutate(link.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {adding ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 space-y-2">
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Title  (e.g. Confluence page, Jira ticket)" className={fieldCls} />
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder="https://…" className={fieldCls}
            onKeyDown={e => {
              if (e.key === 'Enter' && newTitle.trim() && newUrl.trim()) createMut.mutate({ title: newTitle, url: newUrl })
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewUrl('') }
            }} />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewUrl('') }}
              className="flex-1 py-1.5 text-xs text-zinc-400 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={() => { if (newTitle.trim() && newUrl.trim()) createMut.mutate({ title: newTitle, url: newUrl }) }}
              disabled={!newTitle.trim() || !newUrl.trim() || createMut.isPending}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors">
              {createMut.isPending ? 'Adding…' : 'Add Link'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          <Plus size={11} /> Add link
        </button>
      )}
    </div>
  )
}
