import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Minus } from 'lucide-react'

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Red',     value: '#f87171' },
  { label: 'Orange',  value: '#fb923c' },
  { label: 'Yellow',  value: '#facc15' },
  { label: 'Green',   value: '#4ade80' },
  { label: 'Sky',     value: '#38bdf8' },
  { label: 'Violet',  value: '#a78bfa' },
  { label: 'Pink',    value: '#f472b6' },
]

const HIGHLIGHT_COLORS = [
  { label: 'None',    value: null },
  { label: 'Yellow',  value: '#fef08a' },
  { label: 'Green',   value: '#bbf7d0' },
  { label: 'Blue',    value: '#bfdbfe' },
  { label: 'Pink',    value: '#fecaca' },
  { label: 'Purple',  value: '#e9d5ff' },
  { label: 'Orange',  value: '#fed7aa' },
]

const btnBase = 'flex items-center justify-center w-6 h-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-[11px] font-semibold'
const btnActive = 'text-zinc-100 bg-zinc-700'

function ToolbarButton({ onClick, active, children, title }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`${btnBase} ${active ? btnActive : ''}`}
      title={title}
    >
      {children}
    </button>
  )
}

function ColorPicker({ label, colors, onSelect, currentColor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o) }}
        className={`${btnBase} flex-col gap-0 h-6`}
        title={label}
      >
        <span className="text-[10px] leading-none font-bold" style={{ color: currentColor || '#a1a1aa' }}>A</span>
        <span className="w-3.5 h-[3px] rounded-full mt-0.5" style={{ background: currentColor || '#a1a1aa' }} />
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 flex flex-wrap gap-1 w-[100px] shadow-xl">
          {colors.map(c => (
            <button
              key={c.label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(c.value); setOpen(false) }}
              title={c.label}
              className="w-5 h-5 rounded border border-zinc-700 hover:scale-110 transition-transform"
              style={{ background: c.value || '#27272a' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RichTextEditor({ content, onUpdate, onBlur }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        'data-placeholder': 'Start writing…',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
  })

  if (!editor) return null

  const currentTextColor = editor.getAttributes('textStyle').color || null
  const currentHighlight = editor.getAttributes('highlight').color || null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap py-2 mb-3 border-b border-zinc-800/60 shrink-0">
        {/* Heading toggles */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="Normal text"
        >¶</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >H1</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >H2</ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >H3</ToolbarButton>

        <div className="w-px h-4 bg-zinc-800 mx-1" />

        {/* Inline formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        ><Bold size={11} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        ><Italic size={11} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        ><UnderlineIcon size={11} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        ><Strikethrough size={11} /></ToolbarButton>

        <div className="w-px h-4 bg-zinc-800 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        ><List size={12} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        ><ListOrdered size={12} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="Divider"
        ><Minus size={12} /></ToolbarButton>

        <div className="w-px h-4 bg-zinc-800 mx-1" />

        {/* Text color */}
        <ColorPicker
          label="Text color"
          colors={TEXT_COLORS}
          currentColor={currentTextColor}
          onSelect={(color) => {
            if (color) editor.chain().focus().setColor(color).run()
            else editor.chain().focus().unsetColor().run()
          }}
        />

        {/* Highlight */}
        <ColorPicker
          label="Highlight"
          colors={HIGHLIGHT_COLORS}
          currentColor={currentHighlight}
          onSelect={(color) => {
            if (color) editor.chain().focus().setHighlight({ color }).run()
            else editor.chain().focus().unsetHighlight().run()
          }}
        />
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1 min-h-0" />
    </div>
  )
}
