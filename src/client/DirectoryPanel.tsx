/**
 * DirectoryToggle + DirectoryPanel — the session-header "目录" button and the
 * draggable floating directory panel it toggles.
 *
 * Data flow (all plain JSON, no live Host objects):
 *  - cwd comes from the sessions list snapshot: useSessions(s => s.current)
 *    then byId[current]?.cwd
 *  - the listing comes from the injected Host route call (files + directories)
 *
 * The panel is a fixed-position overlay seat: draggable by its header bar,
 * with a continuous background-opacity slider and indented child rows so
 * entries read as nested under the current directory line.
 */
import { useEffect, useRef, useState } from 'react'
import * as React from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { DirectoryPanelProps, DirectoryToggleProps, DirEntryJson } from './index.ts'

/** Panel visibility store shared by the toggle button and the overlay panel. */
interface PanelStore {
  open: boolean
  listeners: Set<() => void>
  get: () => boolean
  set: (v: boolean) => void
  toggle: () => void
  subscribe: (fn: () => void) => () => void
}

const panelStore: PanelStore = {
  open: false,
  listeners: new Set(),
  get() { return this.open },
  set(v) { this.open = v; for (const fn of this.listeners) fn() },
  toggle() { this.set(!this.open) },
  subscribe(fn) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } },
}

const PANEL_WIDTH = 280
const DEFAULT_POS = { x: 272, y: 64 }

/** Real theme tokens (verified via Theme.listTokens). */
const T = {
  bg: 'var(--dsw-alias-bg-overlay)',
  border: 'var(--dsw-alias-border-l1)',
  label: 'var(--dsw-alias-label-primary)',
  labelDim: 'var(--dsw-alias-label-secondary)',
  error: 'var(--dsw-alias-state-error-primary)',
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

/** Trim a long path to its tail for display, keeping the head for hover. */
function basenameOf(path: string | undefined): string {
  if (path === undefined || path === '') return ''
  const trimmed = path.replace(/[/\\]+$/, '')
  const base = trimmed.split(/[/\\]/).pop()
  return base !== undefined && base !== '' ? base : path
}

/** Join a directory path with one child basename on either separator flavor. */
function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/'
  return dir.replace(/[/\\]+$/, '') + sep + name
}

/** Feather-style outline folder icon (24 viewBox, currentColor stroke). */
export function FolderIcon({ size = 16 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/** The "目录" toggle button in the session header action row. */
export function DirectoryToggle(_props: DirectoryToggleProps): React.ReactElement {
  const open = useSyncExternalStoreSafe(panelStore.subscribe, panelStore.get)
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '28px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid transparent',
    cursor: 'pointer',
    background: open ? `color-mix(in srgb, ${T.label} 12%, transparent)` : 'transparent',
    color: T.label,
    fontSize: '13px',
    lineHeight: 1,
  }
  return (
    <button
      type="button"
      aria-label="目录"
      title="目录"
      onClick={() => { panelStore.toggle() }}
      style={style}
    >
      <FolderIcon size={14} />
      <span>目录</span>
    </button>
  )
}

/** The draggable floating directory panel in shell.overlay. */
export function DirectoryPanel(props: DirectoryPanelProps): React.ReactElement | null {
  const { useSessions, listDirectory } = props
  const open = useSyncExternalStoreSafe(panelStore.subscribe, panelStore.get)
  const currentId = useSessions((s: SessionListState) => s.current)
  const byId = useSessions((s: SessionListState) => s.byId ?? {})
  const cwd = currentId !== undefined ? byId[currentId]?.cwd : undefined

  const [path, setPath] = useState<string | undefined>(undefined)
  const [entries, setEntries] = useState<DirEntryJson[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState(DEFAULT_POS)
  const [opacity, setOpacity] = useState(0.9)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  // Reset navigation when the session's working directory changes.
  useEffect(() => { setPath(undefined); setError(undefined) }, [cwd])

  const visible = path ?? cwd

  // Re-list whenever the visible directory changes while open.
  useEffect(() => {
    if (!open || visible === undefined) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    listDirectory(visible).then((result) => {
      if (cancelled) return
      setEntries(result.entries)
      setLoading(false)
    }).catch((reason: unknown) => {
      if (cancelled) return
      setError(reason instanceof Error ? reason.message : String(reason))
      setEntries(undefined)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, visible, listDirectory])

  if (!open || cwd === undefined || cwd === '') return null

  const dirs = (entries ?? []).filter(e => e.type === 'directory')
  const files = (entries ?? []).filter(e => e.type !== 'directory')

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: FONT,
    fontSize: '12px',
    lineHeight: '22px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    color: T.label,
  }
  // Child rows are indented under the current-directory line so entries read
  // as nested, not sibling.
  const childRow: React.CSSProperties = { ...row, paddingLeft: '22px' }
  const panelBg = `color-mix(in srgb, ${T.bg} ${Math.round(opacity * 100)}%, transparent)`

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current
    if (d === null) return
    setPos({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div style={{
      position: 'fixed',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${PANEL_WIDTH}px`,
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      background: panelBg,
      border: `1px solid ${T.border}`,
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      zIndex: 1000,
      overflow: 'hidden',
      pointerEvents: 'auto',
      color: T.label,
      fontFamily: FONT,
    }}>
      {/* Draggable header bar with an opacity slider. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 8px 6px 12px',
          cursor: 'move',
          userSelect: 'none',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: T.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📁 目录
        </span>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={String(Math.round(opacity * 100))}
            onChange={(e) => { setOpacity(Number(e.target.value) / 100) }}
            title={`背景透明度 ${Math.round(opacity * 100)}%`}
            style={{ width: '64px', cursor: 'pointer', accentColor: T.label, margin: 0 }}
          />
          <button
            type="button"
            onClick={() => { panelStore.set(false) }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: T.labelDim, fontSize: '13px', padding: '0 2px' }}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: '6px 8px', overflowY: 'auto', minHeight: '40px' }}>
        {/* Current directory line (no indent): the anchor of the tree. */}
        <div title={visible} style={{ ...row, cursor: 'default' }}>
          <span style={{ flexShrink: 0, display: 'inline-flex' }}><FolderIcon size={14} /></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{basenameOf(visible)}</span>
          <span style={{ color: T.labelDim, overflow: 'hidden', textOverflow: 'ellipsis' }}>{visible}</span>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: '4px', paddingTop: '4px' }}>
          {loading && (
            <div style={{ ...childRow, cursor: 'default', opacity: 0.6 }}>…</div>
          )}
          {error !== undefined && (
            <div style={{ ...childRow, cursor: 'default', color: T.error }}>⚠ {error}</div>
          )}
          {!loading && error === undefined && entries !== undefined && (
            <>
              {path !== undefined && (
                <div role="button" tabIndex={0} onClick={() => { setPath(undefined) }} style={{ ...childRow, opacity: 0.7 }}>
                  <span style={{ flexShrink: 0 }}>↩</span>
                  <span>..</span>
                </div>
              )}
              {dirs.map(entry => (
                <div
                  key={`d:${entry.name}`}
                  role="button"
                  tabIndex={0}
                  title={entry.name}
                  onClick={() => { if (visible !== undefined) setPath(joinPath(visible, entry.name)) }}
                  style={childRow}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}><FolderIcon size={14} /></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                </div>
              ))}
              {files.map(entry => (
                <div
                  key={`f:${entry.name}`}
                  title={`${entry.name}${entry.size !== undefined ? ` (${entry.size} B)` : ''}`}
                  style={{ ...childRow, cursor: 'default', opacity: 0.8 }}
                >
                  <span style={{ flexShrink: 0 }}>📄</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                </div>
              ))}
              {entries.length === 0 && (
                <div style={{ ...childRow, cursor: 'default', opacity: 0.6 }}>(empty)</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * useSyncExternalStore wrapper that tolerates environments without the hook
 * (falls back to reading the store directly; the overlay is re-rendered by
 * the dispatching skeleton anyway).
 */
function useSyncExternalStoreSafe(subscribe: (fn: () => void) => () => void, getSnapshot: () => boolean): boolean {
  const hook = (React as unknown as { useSyncExternalStore?: (s: (fn: () => void) => () => void, g: () => boolean) => boolean }).useSyncExternalStore
  if (hook !== undefined) return hook(subscribe, getSnapshot)
  const [, force] = useState(0)
  useEffect(() => subscribe(() => force(n => n + 1)), [subscribe])
  return getSnapshot()
}
