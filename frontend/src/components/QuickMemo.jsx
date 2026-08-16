import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, FileText, AlertCircle, Calendar, ChevronRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { createTask } from '../api/tasks'
import { useQuickMemo } from '../context/QuickMemoContext'

const TRAY_PROJECT_ID = 11

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function autoTitle(memo, idx) {
  if (memo.title.trim()) return memo.title.trim()
  const firstLine = memo.body.trim().split('\n')[0]
  if (firstLine) return firstLine.slice(0, 30) + (firstLine.length > 30 ? '…' : '')
  return `クイックメモ #${idx + 1} (${localToday().slice(5)})`
}

const PRI_LABEL = { high: 'High', medium: 'Med', low: 'Low' }
const PRI_COLOR = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.4)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,.1)',   border: 'rgba(251,191,36,.35)' },
  low:    { color: '#4ade80', bg: 'rgba(74,222,128,.1)',   border: 'rgba(74,222,128,.35)' },
}
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', testing: 'Testing', waiting: 'Waiting', on_hold: 'On Hold', done: 'Done', cancelled: 'Cancelled', up_next: 'Up Next' }
const STATUS_COLOR = { todo: '#71717a', in_progress: '#6366f1', review: '#f59e0b', testing: '#06b6d4', waiting: '#f97316', on_hold: '#a78bfa', done: '#22c55e', cancelled: '#ef4444', up_next: '#3b82f6' }

let memoCounter = 1

function makeMemo() {
  return { id: memoCounter++, body: '', title: '', priority: null, dueDate: '', expanded: true }
}

// ── MiniModal: task detail when panel is open ──────────────
function MiniModal({ task, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pri = task.priority ? PRI_COLOR[task.priority] : null
  const statusColor = STATUS_COLOR[task.status] ?? '#71717a'
  const statusLabel = STATUS_LABEL[task.status] ?? task.status

  return createPortal(
    <>
      {/* backdrop — only covers main area (left of panel) */}
      <div
        style={{ position: 'fixed', inset: 0, right: 340, zIndex: 9990, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(1px)' }}
        onClick={onClose}
      />
      {/* modal centered in main area */}
      <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 340, zIndex: 9991, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: 420, maxHeight: 380, pointerEvents: 'all',
          background: '#18181b', border: '1px solid #3f3f46',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,.8)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderBottom: '1px solid #27272a', background: '#1c1c1f' }}>
            <span style={{ fontSize: 11, color: '#52525b', fontFamily: 'monospace', paddingTop: 2, flexShrink: 0 }}>#{task.id}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#e4e4e7', lineHeight: 1.4 }}>{task.title}</span>
            <button
              onClick={onClose}
              style={{ width: 24, height: 24, borderRadius: 5, background: '#27272a', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>

          {/* meta chips */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid #27272a', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${statusColor}18`, color: statusColor }}>
              {statusLabel}
            </span>
            {pri && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: pri.bg, color: pri.color }}>
                <AlertCircle size={10} />
                {PRI_LABEL[task.priority]}
              </span>
            )}
            {task.due_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,.1)', color: '#818cf8' }}>
                <Calendar size={10} />
                {format(parseISO(task.due_date), 'M/d')}
              </span>
            )}
          </div>

          {/* notes */}
          <div style={{ flex: 1, padding: '12px 16px', fontSize: 12.5, color: task.notes ? '#a1a1aa' : '#3f3f46', fontStyle: task.notes ? 'normal' : 'italic', lineHeight: 1.65, overflowY: 'auto' }}>
            {task.notes || 'メモなし'}
          </div>

          {/* details */}
          {task.details && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #27272a', fontSize: 11.5, color: '#71717a', lineHeight: 1.6, borderBottom: 'none' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#52525b', display: 'block', marginBottom: 4 }}>DETAILS</span>
              {task.details}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

// ── MemoCard ────────────────────────────────────────────────
function MemoCard({ memo, idx, onChange, onDelete }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (memo.expanded && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [memo.expanded])

  const pri = memo.priority ? PRI_COLOR[memo.priority] : null

  const previewText = memo.body.trim()
    ? memo.body.trim().split('\n')[0].slice(0, 50)
    : null

  return (
    <div style={{
      background: '#1c1c1f',
      border: `1px solid ${memo.expanded ? '#6366f1' : '#27272a'}`,
      borderRadius: 10,
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: memo.expanded ? '0 0 0 1px rgba(99,102,241,.2)' : 'none',
      transition: 'border-color .15s',
    }}>
      {/* card header */}
      <div
        onClick={() => onChange({ expanded: !memo.expanded })}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 10px', background: '#222226',
          borderBottom: memo.expanded ? '1px solid #2a2a2e' : '1px solid transparent',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 4, fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: memo.expanded ? '#4f46e5' : '#27272a',
          color: memo.expanded ? '#fff' : '#71717a',
          transition: 'background .15s',
        }}>
          {idx + 1}
        </div>

        <span style={{ flex: 1, fontSize: 11.5, color: memo.expanded ? '#d4d4d8' : '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {memo.title.trim() || (previewText ? previewText : <span style={{ fontStyle: 'italic', color: '#52525b' }}>タイトル未設定</span>)}
        </span>

        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {pri && <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: pri.bg, color: pri.color }}>{PRI_LABEL[memo.priority]}</span>}
          {memo.dueDate && <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: 'rgba(99,102,241,.12)', color: '#818cf8' }}>{memo.dueDate.slice(5)}</span>}
        </div>

        <ChevronRight size={12} color="#52525b" style={{ flexShrink: 0, transition: 'transform .15s', transform: memo.expanded ? 'rotate(90deg)' : 'none' }} />
      </div>

      {/* collapsed preview */}
      {!memo.expanded && previewText && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: '#52525b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {previewText}
        </div>
      )}

      {/* expanded body */}
      {memo.expanded && (
        <>
          <textarea
            ref={textareaRef}
            value={memo.body}
            onChange={e => onChange({ body: e.target.value })}
            placeholder="メモを入力…"
            style={{
              width: '100%', minHeight: 88, padding: '10px', resize: 'none',
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12.5, color: '#d4d4d8', lineHeight: 1.6, fontFamily: 'inherit',
            }}
          />

          {/* optional fields */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', padding: '6px 10px', borderTop: '1px solid #27272a', background: '#1e1e22' }}>
            <span style={{ fontSize: 9.5, color: '#52525b', marginRight: 2 }}>オプション</span>

            {/* priority chips */}
            {['high', 'medium', 'low'].map(p => {
              const c = PRI_COLOR[p]
              const active = memo.priority === p
              return (
                <button
                  key={p}
                  onClick={() => onChange({ priority: active ? null : p })}
                  style={{
                    padding: '2px 7px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                    border: `1px ${active ? 'solid' : 'dashed'} ${active ? c.border : '#3f3f46'}`,
                    background: active ? c.bg : 'transparent',
                    color: active ? c.color : '#71717a',
                    transition: 'all .12s',
                  }}
                >
                  {PRI_LABEL[p]}
                </button>
              )
            })}

            {/* due date */}
            <input
              type="date"
              value={memo.dueDate}
              onChange={e => onChange({ dueDate: e.target.value })}
              style={{
                padding: '2px 7px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                border: `1px ${memo.dueDate ? 'solid' : 'dashed'} ${memo.dueDate ? 'rgba(99,102,241,.5)' : '#3f3f46'}`,
                background: memo.dueDate ? 'rgba(99,102,241,.08)' : 'transparent',
                color: memo.dueDate ? '#818cf8' : '#71717a',
                outline: 'none', colorScheme: 'dark',
              }}
            />

            {/* title */}
            <input
              type="text"
              value={memo.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="＋ タイトル"
              style={{
                flex: 1, minWidth: 60, padding: '2px 7px', borderRadius: 5, fontSize: 10,
                border: `1px dashed ${memo.title ? '#52525b' : '#3f3f46'}`,
                background: 'transparent', color: '#a1a1aa', outline: 'none',
              }}
            />

            <button
              onClick={onDelete}
              title="削除"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'none' }}
            >
              <X size={11} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── QuickMemo main component ────────────────────────────────
export default function QuickMemo() {
  const { isOpen, closePanel, previewedTask, clearPreview } = useQuickMemo()
  const [memos, setMemos] = useState(() => [makeMemo()])
  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (tasks) => Promise.all(tasks.map(t => createTask(t))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setMemos([makeMemo()])
      closePanel()
    },
  })

  const updateMemo = useCallback((id, patch) => {
    setMemos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }, [])

  const deleteMemo = useCallback((id) => {
    setMemos(prev => {
      const next = prev.filter(m => m.id !== id)
      return next.length === 0 ? [makeMemo()] : next
    })
  }, [])

  const addMemo = useCallback(() => {
    const newMemo = makeMemo()
    setMemos(prev => [
      ...prev.map(m => ({ ...m, expanded: false })),
      newMemo,
    ])
  }, [])

  function saveAll() {
    if (saveMutation.isPending) return
    const tasks = memos
      .filter(m => m.body.trim())
      .map((m, i) => ({
        title:      autoTitle(m, i),
        project_id: TRAY_PROJECT_ID,
        priority:   m.priority ?? 'medium',
        status:     'todo',
        due_date:   m.dueDate || null,
        notes:      m.body.trim(),
      }))
    if (tasks.length === 0) { closePanel(); return }
    saveMutation.mutate(tasks)
  }

  const hasContent = memos.some(m => m.body.trim())
  const saveCount  = memos.filter(m => m.body.trim()).length

  // close with Escape when no modal is open
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape' && !previewedTask) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, previewedTask, closePanel])

  return (
    <>
      {/* mini modal */}
      {previewedTask && <MiniModal task={previewedTask} onClose={clearPreview} />}

      {/* side panel */}
      <div style={{
        width: isOpen ? 340 : 0,
        background: '#18181b',
        borderLeft: isOpen ? '1px solid #3f3f46' : '1px solid transparent',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        transition: 'width .25s cubic-bezier(.4,0,.2,1), border-color .25s',
        overflow: 'hidden',
      }}>
        {isOpen && (
          <>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #27272a', background: '#1c1c1f', flexShrink: 0 }}>
              <FileText size={13} color="#a78bfa" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', letterSpacing: '.05em', flex: 1, whiteSpace: 'nowrap' }}>クイックメモ</span>
              <button
                onClick={closePanel}
                style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #3f3f46', background: 'transparent', color: '#71717a', fontSize: 11, cursor: 'pointer' }}
              >
                閉じる
              </button>
              <button
                onClick={saveAll}
                disabled={!hasContent || saveMutation.isPending}
                style={{
                  padding: '4px 10px', borderRadius: 5, border: 'none',
                  background: hasContent ? '#4f46e5' : '#27272a',
                  color: hasContent ? '#fff' : '#52525b',
                  fontSize: 11, fontWeight: 600, cursor: hasContent ? 'pointer' : 'default',
                  whiteSpace: 'nowrap', transition: 'background .15s',
                }}
              >
                {saveMutation.isPending ? '保存中…' : `Trayに保存 (${saveCount})`}
              </button>
            </div>

            {/* cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memos.map((memo, idx) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  idx={idx}
                  onChange={patch => updateMemo(memo.id, patch)}
                  onDelete={() => deleteMemo(memo.id)}
                />
              ))}

              {/* add card */}
              <button
                onClick={addMemo}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: 9, borderRadius: 8, border: '1px dashed #27272a',
                  background: 'transparent', color: '#52525b', fontSize: 11, cursor: 'pointer',
                  flexShrink: 0, transition: 'border-color .15s, color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.color = '#a1a1aa' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#52525b' }}
              >
                <Plus size={12} />
                メモを追加
              </button>
            </div>

            {/* footer */}
            <div style={{ padding: 10, borderTop: '1px solid #27272a', background: '#141416', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>📥</div>
                <span style={{ fontSize: 11, color: '#52525b', flex: 1 }}>保存先: Tray</span>
                <span style={{ fontSize: 11, color: '#71717a', background: '#27272a', padding: '2px 7px', borderRadius: 4 }}>{memos.length}件</span>
              </div>
              <div style={{ fontSize: 10, color: '#3f3f46', marginTop: 4 }}>会議後にTrayからプロジェクトへ移動できます</div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
