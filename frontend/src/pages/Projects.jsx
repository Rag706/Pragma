import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FolderKanban, RefreshCw, X, ListTodo, Link2, FileText, BookOpen, ExternalLink, Tag, StickyNote } from 'lucide-react'
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects'
import { getStats } from '../api/stats'
import { getProjectReferences, createReference, updateReference, deleteReference } from '../api/references'
import { getProjectTags, createTag, updateTag, deleteTag } from '../api/tags'
import { getProjectNotes, createNote, updateNote, deleteNote } from '../api/notes'

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#0EA5E9', '#14B8A6',
  '#F97316', '#84CC16',
]

const fieldCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors'

// ── Project form (used inside drawer) ─────────────────────────────
function ProjectForm({ initial, onSubmit, onCancel, loading }) {
  const [name,        setName]  = useState(initial?.name        ?? '')
  const [color,       setColor] = useState(initial?.color       ?? COLORS[0])
  const [type,        setType]  = useState(initial?.type        ?? 'project')
  const [description, setDesc]  = useState(initial?.description ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Name *</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Project name…"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Type</label>
        <select value={type} onChange={e => setType(e.target.value)} className={fieldCls}>
          <option value="project">Project</option>
          <option value="activity">Activity (ongoing)</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Description</label>
        <input
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Optional description…"
          className={fieldCls}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim() || loading}
          onClick={() => onSubmit({ name, color, type, description })}
          className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </div>
  )
}

// ── Project drawer ─────────────────────────────────────────────────
function ProjectDrawer({ open, project, onClose, onSubmit, loading }) {
  const isEdit = !!project

  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl
          flex flex-col transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <span className="text-sm font-semibold text-zinc-200">
            {isEdit ? 'Edit Project' : 'New Project'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {open && (
            <ProjectForm
              key={project?.id ?? 'new'}
              initial={project}
              onSubmit={onSubmit}
              onCancel={onClose}
              loading={loading}
            />
          )}
        </div>
      </div>
    </>
  )
}

// ── Project card ───────────────────────────────────────────────────
function ProjectCard({ project, stats, onEdit, onDelete, onView, onAddTask, onReferences, onTags, onNotes }) {
  const pct     = stats?.pct     ?? 0
  const total   = stats?.total   ?? 0
  const done    = stats?.done    ?? 0
  const overdue = stats?.overdue ?? 0

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors"
      style={{ borderLeftColor: project.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-zinc-100 text-sm">{project.name}</h3>
            {project.type === 'activity' ? (
              <span className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-full">
                <RefreshCw size={9} /> Ongoing
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                <FolderKanban size={9} /> Project
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <button onClick={() => onTags(project)} title="Manage Tags"
            className="p-1.5 text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors">
            <Tag size={13} />
          </button>
          <button onClick={() => onReferences(project)} title="References"
            className="p-1.5 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors">
            <Link2 size={13} />
          </button>
          <button onClick={() => onNotes(project)} title="Notes"
            className="p-1.5 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors">
            <StickyNote size={13} />
          </button>
          <button onClick={() => onEdit(project)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(project)}
            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div><span className="text-zinc-500">Total </span><span className="text-zinc-200 font-semibold">{total}</span></div>
        <div><span className="text-zinc-500">Done </span><span className="text-emerald-400 font-semibold">{done}</span></div>
        {overdue > 0 && (
          <div><span className="text-zinc-500">Overdue </span><span className="text-red-400 font-semibold">{overdue}</span></div>
        )}
      </div>

      {project.type === 'activity' ? (
        <div className="flex items-center gap-2 text-xs text-teal-500/70">
          <RefreshCw size={11} />
          <span>Ongoing — no completion target</span>
        </div>
      ) : (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Progress</span>
            <span className="text-zinc-400">{pct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: project.color }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onAddTask(project.id)}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-colors"
          style={{ backgroundColor: project.color, opacity: 0.9 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.9'}
        >
          <Plus size={12} /> Add Task
        </button>
        <button
          onClick={() => onView(project.id)}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 rounded-lg transition-colors"
        >
          <ListTodo size={12} /> View Tasks
        </button>
      </div>
    </div>
  )
}

// ── References Drawer ──────────────────────────────────────────────
const REF_COLORS = { url: 'text-indigo-400 bg-indigo-500/10', note: 'text-amber-400 bg-amber-500/10', doc: 'text-emerald-400 bg-emerald-500/10' }
const REF_ICONS  = { url: <Link2 size={12} />, note: <FileText size={12} />, doc: <BookOpen size={12} /> }

function ReferencesDrawer({ project, onClose }) {
  const open = !!project
  const qc   = useQueryClient()
  const [form,     setForm]     = useState(null) // null=list, {}=new, {id,...}=edit
  const [editForm, setEditForm] = useState({})

  const { data: refs = [] } = useQuery({
    queryKey: ['references', project?.id],
    queryFn:  () => getProjectReferences(project.id),
    enabled:  !!project?.id,
  })

  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') { if (form) setForm(null); else onClose() } }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, form, onClose])

  const createMut = useMutation({
    mutationFn: (data) => createReference(project.id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['references', project.id] }); setForm(null) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateReference(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['references', project.id] }); setForm(null) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteReference,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['references', project.id] }),
  })

  function openNew()       { setEditForm({ title: '', url: '', notes: '', ref_type: 'url' }); setForm({}) }
  function openEdit(ref)   { setEditForm({ ...ref }); setForm(ref) }
  function handleSave() {
    if (!editForm.title?.trim()) return
    if (form?.id) updateMut.mutate({ id: form.id, ...editForm })
    else          createMut.mutate(editForm)
  }

  const isSaving = createMut.isPending || updateMut.isPending

  const drawerCls = `fixed inset-y-0 right-0 z-50 w-[420px] bg-zinc-900 border-l border-zinc-800 shadow-2xl
    flex flex-col transform transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={drawerCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {form ? (form.id ? 'Edit Reference' : 'New Reference') : 'References'}
            </p>
            {project && !form && <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>}
          </div>
          <button onClick={() => form ? setForm(null) : onClose()}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        {form ? (
          /* ── Edit / New form ── */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Type</label>
              <div className="flex gap-2">
                {['url','note','doc'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setEditForm(f => ({ ...f, ref_type: t }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                      editForm.ref_type === t
                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}>
                    {REF_ICONS[t]}{t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Title *</label>
              <input value={editForm.title ?? ''} onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
                placeholder="e.g. Project SharePoint, WBSe codes…" autoFocus
                className={fieldCls} />
            </div>
            {editForm.ref_type !== 'note' && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">URL</label>
                <input value={editForm.url ?? ''} onChange={e => setEditForm(f => ({...f, url: e.target.value}))}
                  placeholder="https://…" className={fieldCls} />
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Notes</label>
              <textarea value={editForm.notes ?? ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))}
                rows={4} placeholder="Any context, instructions, or reminders…"
                className={`${fieldCls} resize-none`} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!editForm.title?.trim() || isSaving}
                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors">
                {isSaving ? 'Saving…' : form?.id ? 'Save Changes' : 'Add Reference'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Reference list ── */
          <div className="flex-1 overflow-y-auto p-5">
            <button onClick={openNew}
              className="w-full flex items-center gap-2 py-2.5 px-4 mb-4 border border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              <Plus size={14} /> Add reference
            </button>

            {refs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
                <Link2 size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No references yet.</p>
                <p className="text-xs mt-1">Add URLs, notes, and docs for this project.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {refs.map(ref => (
                  <div key={ref.id} className="bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${REF_COLORS[ref.ref_type] ?? REF_COLORS.url}`}>
                          {REF_ICONS[ref.ref_type]} {ref.ref_type}
                        </span>
                        <span className="text-sm font-semibold text-zinc-200">{ref.title}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEdit(ref)} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => { if (confirm('Delete this reference?')) deleteMut.mutate(ref.id) }}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {ref.url && (
                      <a href={ref.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs mb-2 max-w-full transition-colors">
                        <ExternalLink size={11} className="shrink-0" />
                        <span className="truncate">{ref.url}</span>
                      </a>
                    )}
                    {ref.notes && (
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-800 rounded-lg px-3 py-2">
                        {ref.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Notes Drawer ──────────────────────────────────────────────────
const NOTE_COLORS = [
  { name: 'Default', accent: '#a1a1aa' },
  { name: 'Red',     accent: '#fca5a5' },
  { name: 'Orange',  accent: '#fdba74' },
  { name: 'Yellow',  accent: '#fde68a' },
  { name: 'Green',   accent: '#86efac' },
  { name: 'Blue',    accent: '#93c5fd' },
  { name: 'Purple',  accent: '#d8b4fe' },
  { name: 'Pink',    accent: '#f9a8d4' },
]

function NotesDrawer({ project, onClose }) {
  const open = !!project
  const qc   = useQueryClient()
  const [form, setForm] = useState(null) // null=grid, {}=new, {id,...}=edit
  const [editForm, setEditForm] = useState({ title: '', body: '', color: '#a1a1aa' })

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', project?.id],
    queryFn:  () => getProjectNotes(project.id),
    enabled:  !!project?.id,
  })

  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') { if (form) setForm(null); else onClose() } }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, form, onClose])

  const createMut = useMutation({
    mutationFn: (data) => createNote(project.id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['notes', project.id] }); setForm(null) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateNote(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['notes', project.id] }); setForm(null) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteNote,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notes', project.id] }),
  })

  function openNew() {
    setEditForm({ title: '', body: '', color: '#a1a1aa' })
    setForm({})
  }

  function openEdit(note) {
    setEditForm({ title: note.title, body: note.body, color: note.color })
    setForm(note)
  }

  function handleSave() {
    if (!editForm.title.trim() && !editForm.body.trim()) return
    if (form?.id) updateMut.mutate({ id: form.id, ...editForm })
    else          createMut.mutate(editForm)
  }

  const isSaving = createMut.isPending || updateMut.isPending

  const drawerCls = `fixed inset-y-0 right-0 z-50 w-[720px] bg-zinc-900 border-l border-zinc-800 shadow-2xl
    flex flex-col transform transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={drawerCls}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {form ? (form.id ? 'Edit Note' : 'New Note') : 'Notes'}
            </p>
            {project && !form && <p className="text-xs text-zinc-500 mt-0.5">{project.name} · {notes.length} note{notes.length !== 1 ? 's' : ''}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!form && (
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={12} /> Add Note
              </button>
            )}
            <button onClick={() => form ? setForm(null) : onClose()}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {form ? (
          /* ── New / Edit form ── */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Title</label>
              <input
                autoFocus
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Note title…"
                className={fieldCls}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Body</label>
              <textarea
                value={editForm.body}
                onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                rows={6}
                placeholder="Write your note…"
                className={`${fieldCls} resize-none`}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.accent}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, color: c.accent }))}
                    title={c.name}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 border-2"
                    style={{
                      backgroundColor: c.accent,
                      borderColor: editForm.color === c.accent ? '#f4f4f5' : 'transparent',
                      transform: editForm.color === c.accent ? 'scale(1.15)' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setForm(null)} className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={(!editForm.title.trim() && !editForm.body.trim()) || isSaving}
                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving…' : form?.id ? 'Save Changes' : 'Add Note'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Card grid ── */
          <div className="flex-1 overflow-y-auto p-5">
            {notes.length === 0 ? (
              /* Empty state — show one "Add note" card */
              <div
                onClick={openNew}
                className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                  <Plus size={18} className="text-zinc-500 group-hover:text-zinc-300" />
                </div>
                <p className="text-sm text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">New note</p>
                <p className="text-xs text-zinc-700">No notes yet for this project</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 items-start">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-3 group/card hover:-translate-y-0.5 transition-all duration-150 hover:shadow-lg hover:border-zinc-600"
                    style={{ borderTopColor: note.color, borderTopWidth: 4 }}
                  >
                    {note.title && (
                      <p className="text-sm font-bold text-zinc-100 leading-snug pr-1">{note.title}</p>
                    )}
                    {note.body && (
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap flex-1">{note.body}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                        {NOTE_COLORS.find(c => c.accent === note.color)?.name ?? 'Custom'}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(note)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this note?')) deleteMut.mutate(note.id) }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add note card */}
                <div
                  onClick={openNew}
                  className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] cursor-pointer transition-all hover:-translate-y-0.5 group/add"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover/add:bg-zinc-700 flex items-center justify-center transition-colors">
                    <Plus size={14} className="text-zinc-500 group-hover/add:text-zinc-300" />
                  </div>
                  <span className="text-xs text-zinc-500 group-hover/add:text-zinc-300 font-medium transition-colors">New note</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Tags Drawer ────────────────────────────────────────────────────
const TAG_PALETTE = [
  '#6366f1','#8b5cf6','#ec4899','#f87171','#fb923c',
  '#fbbf24','#34d399','#14b8a6','#38bdf8','#a78bfa',
]

function TagsDrawer({ project, onClose }) {
  const open = !!project
  const qc   = useQueryClient()
  const [name,  setName]  = useState('')
  const [color, setColor] = useState(TAG_PALETTE[0])
  const [editId,  setEditId]  = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const { data: tags = [] } = useQuery({
    queryKey: ['projectTags', project?.id],
    queryFn:  () => getProjectTags(project.id),
    enabled:  !!project?.id,
  })

  const createMut = useMutation({
    mutationFn: (data) => createTag(project.id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projectTags', project.id] }); setName('') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateTag(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projectTags', project.id] }); setEditId(null) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteTag,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['projectTags', project.id] }),
  })

  const drawerCls = `fixed inset-y-0 right-0 z-50 w-[380px] bg-zinc-900 border-l border-zinc-800 shadow-2xl
    flex flex-col transform transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={drawerCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Manage Tags</p>
            {project && <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">Project Tags</p>
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/50 border border-zinc-800 rounded-xl group">
                  <span className="w-7 h-7 rounded-lg shrink-0 border-2" style={{ background: `${tag.color}30`, borderColor: tag.color }} />
                  {editId === tag.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => { if (editName.trim()) updateMut.mutate({ id: tag.id, name: editName }); else setEditId(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) updateMut.mutate({ id: tag.id, name: editName }); else setEditId(null) } if (e.key === 'Escape') setEditId(null) }}
                      className="flex-1 bg-transparent text-sm text-zinc-200 focus:outline-none border-b border-indigo-500 pb-0.5"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-zinc-200">{tag.name}</span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(tag.id); setEditName(tag.name) }}
                      className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"><Pencil size={11} /></button>
                    <button onClick={() => { if (confirm(`Delete tag "${tag.name}"? It will be removed from all tasks.`)) deleteMut.mutate(tag.id) }}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New tag form */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">New Tag</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TAG_PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && name.trim()) createMut.mutate({ name, color }) }}
                placeholder="Tag name…" className={`${fieldCls} flex-1`} />
              <button onClick={() => { if (name.trim()) createMut.mutate({ name, color }) }}
                disabled={!name.trim() || createMut.isPending}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Projects page ─────────────────────────────────────────────
export default function Projects() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  // drawer state: null = closed, {} = new, {...project} = edit
  const [drawerProject, setDrawerProject] = useState(null)
  const drawerOpen = drawerProject !== null

  // references / tags / notes drawer state
  const [refsProject,  setRefsProject]  = useState(null)
  const [tagsProject,  setTagsProject]  = useState(null)
  const [notesProject, setNotesProject] = useState(null)

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const { data: stats }         = useQuery({ queryKey: ['stats'],    queryFn: getStats })

  const statsMap = Object.fromEntries(
    (stats?.project_stats ?? []).map(p => [p.id, p])
  )

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setDrawerProject(null) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateProject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setDrawerProject(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const isEdit    = drawerProject && drawerProject.id
  const isSaving  = createMutation.isPending || updateMutation.isPending

  function handleSubmit(data) {
    if (isEdit) updateMutation.mutate({ id: drawerProject.id, ...data })
    else        createMutation.mutate(data)
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setDrawerProject({})}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <FolderKanban size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No projects yet.</p>
          <button
            onClick={() => setDrawerProject({})}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
          >
            Create your first project →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              stats={statsMap[p.id]}
              onEdit={proj => setDrawerProject(proj)}
              onDelete={proj => {
                if (confirm(`Delete "${proj.name}" and all its tasks?\n\nThis cannot be undone.`))
                  deleteMutation.mutate(proj.id)
              }}
              onView={id => navigate(`/tasks?project=${id}`)}
              onAddTask={id => navigate(`/tasks?project=${id}&new=1`)}
              onReferences={proj => setRefsProject(proj)}
              onTags={proj => setTagsProject(proj)}
              onNotes={proj => setNotesProject(proj)}
            />
          ))}
        </div>
      )}

      {/* Unified create/edit drawer */}
      <ProjectDrawer
        open={drawerOpen}
        project={isEdit ? drawerProject : null}
        onClose={() => setDrawerProject(null)}
        onSubmit={handleSubmit}
        loading={isSaving}
      />

      <ReferencesDrawer
        project={refsProject}
        onClose={() => setRefsProject(null)}
      />

      <TagsDrawer
        project={tagsProject}
        onClose={() => setTagsProject(null)}
      />

      <NotesDrawer
        project={notesProject}
        onClose={() => setNotesProject(null)}
      />
    </div>
  )
}
