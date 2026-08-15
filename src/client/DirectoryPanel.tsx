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

/** localStorage key for panel open state (survives harness restarts). */
const STORE_OPEN_KEY = 'dsw-workspace-dir:panelOpen'

/** Read panel open state from localStorage; defaults to closed. */
function loadPanelOpen(): boolean {
  try { return localStorage.getItem(STORE_OPEN_KEY) === '1' } catch { return false }
}

/** Persist panel open state; failures are ignored. */
function savePanelOpen(open: boolean): void {
  try { localStorage.setItem(STORE_OPEN_KEY, open ? '1' : '0') } catch { /* ignore */ }
}

/**
 * Panel visibility store shared by the toggle button and the overlay panel.
 * Built through a closure factory: methods capture the `store` variable
 * instead of relying on `this`, so React's useSyncExternalStore can call
 * `subscribe(fn)` unbound without losing the listeners set. The open state
 * is persisted to localStorage so the panel reopens the way the user left it.
 */
function createPanelStore(): PanelStore {
  const store: PanelStore = {
    open: loadPanelOpen(),
    listeners: new Set(),
    get() { return store.open },
    set(v) { store.open = v; savePanelOpen(v); for (const fn of store.listeners) fn() },
    toggle() { store.set(!store.open) },
    subscribe(fn) { store.listeners.add(fn); return () => { store.listeners.delete(fn) } },
  }
  return store
}

const panelStore: PanelStore = createPanelStore()

const PANEL_WIDTH = 280
const DEFAULT_POS = { x: 272, y: 64 }

/** localStorage keys for panel UI state (survives harness restarts). */
const STORE_POS_KEY = 'dsw-workspace-dir:panelPos'
const STORE_OPACITY_KEY = 'dsw-workspace-dir:panelOpacity'
const OPACITY_MIN = 0
const OPACITY_MAX = 1
/** First-run default: most transparent but still visible (the slider can go down to 0). */
const OPACITY_DEFAULT = 0.2

/** Read panel position from localStorage; falls back to the default. */
function loadPanelPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORE_POS_KEY)
    if (raw === null) return DEFAULT_POS
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown }
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return DEFAULT_POS
    return { x: Math.max(0, parsed.x), y: Math.max(0, parsed.y) }
  } catch {
    return DEFAULT_POS
  }
}

/** Persist panel position; failures (e.g. sandboxed iframe) are ignored. */
function savePanelPos(pos: { x: number; y: number }): void {
  try { localStorage.setItem(STORE_POS_KEY, JSON.stringify(pos)) } catch { /* ignore */ }
}

/** Read panel opacity from localStorage; falls back to the default (20%). */
function loadPanelOpacity(): number {
  try {
    const raw = localStorage.getItem(STORE_OPACITY_KEY)
    if (raw === null) return OPACITY_DEFAULT
    const value = Number(raw)
    return Number.isFinite(value) && value >= OPACITY_MIN && value <= OPACITY_MAX ? value : OPACITY_DEFAULT
  } catch {
    return OPACITY_DEFAULT
  }
}

/** Persist panel opacity; failures are ignored. */
function savePanelOpacity(opacity: number): void {
  try { localStorage.setItem(STORE_OPACITY_KEY, String(opacity)) } catch { /* ignore */ }
}

/**
 * Panel UI state persisted across open/close AND harness restarts: module
 * scope seeds from localStorage so the panel reopens where / at what opacity
 * the user left it, instead of resetting every time. Opacity defaults to 20%
 * (most transparent but visible); the slider can go down to 0%.
 */
let panelPos = loadPanelPos()
let panelOpacity = loadPanelOpacity()

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

/** Feather-style external-link icon (24 viewBox, currentColor stroke) — matches the folder icon. */
export function OpenExternalIcon({ size = 13 }: { size?: number }): React.ReactElement {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

/** The draggable floating directory panel in shell.overlay. */
export function DirectoryPanel(props: DirectoryPanelProps): React.ReactElement | null {
  const { useSessions, listDirectory, openDirectory } = props
  const open = useSyncExternalStoreSafe(panelStore.subscribe, panelStore.get)
  const currentId = useSessions((s: SessionListState) => s.current)
  const byId = useSessions((s: SessionListState) => s.byId ?? {})
  const cwd = currentId !== undefined ? byId[currentId]?.cwd : undefined

  const [path, setPath] = useState<string | undefined>(undefined)
  const [entries, setEntries] = useState<DirEntryJson[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [openError, setOpenError] = useState<string | undefined>(undefined)
  /** Transient note after a successful OS-file-manager open (Windows may not raise the window). */
  const [openNote, setOpenNote] = useState<string | undefined>(undefined)
  const openNoteTimerRef = useRef<number | undefined>(undefined)
  /** Drives the toast's fade/slide-in transition (off on mount, on next frame). */
  const [toastIn, setToastIn] = useState(false)
  /** Hovered / pressed interactive element key (feedback state). */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState(panelPos)
  const [opacity, setOpacity] = useState(panelOpacity)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  // Reset navigation when the session's working directory changes.
  useEffect(() => {
    setPath(undefined); setError(undefined); setOpenError(undefined); setOpenNote(undefined)
  }, [cwd])

  // Clear any pending open-note timer on unmount.
  useEffect(() => () => {
    if (openNoteTimerRef.current !== undefined) window.clearTimeout(openNoteTimerRef.current)
  }, [])

  // Animate the toast in on the frame after it appears (transition needs a state flip).
  useEffect(() => {
    if (openNote === undefined) { setToastIn(false); return }
    const raf = requestAnimationFrame(() => setToastIn(true))
    return () => cancelAnimationFrame(raf)
  }, [openNote])

  const visible = path ?? cwd

  /** Open a directory in the OS file manager; surface failures inline. */
  const onOpenDirectory = (target: string): void => {
    setOpenError(undefined)
    setOpenNote(undefined)
    openDirectory(target).then(() => {
      setOpenNote('已在文件管理器中打开；若窗口未置前，请点任务栏图标')
      if (openNoteTimerRef.current !== undefined) window.clearTimeout(openNoteTimerRef.current)
      openNoteTimerRef.current = window.setTimeout(() => setOpenNote(undefined), 5000)
    }).catch((reason: unknown) => {
      setOpenError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  /**
   * Hover-highlight alpha: shift the panel's background opacity by ±20% so the
   * hovered clickable area stands out — brighter on transparent panels (≤50%),
   * fainter on opaque ones (>50%); restoring on mouse leave.
   */
  const hoverAlpha = (): number => opacity <= 0.5 ? Math.min(1, opacity + 0.2) : Math.max(0, opacity - 0.2)

  /** Pointer/mouse feedback handlers keyed per interactive element. */
  const interactiveHandlers = (key: string) => ({
    onMouseEnter: () => setHoverKey(key),
    onMouseLeave: () => setHoverKey(null),
    onPointerDown: () => setActiveKey(key),
    onPointerUp: () => setActiveKey(null),
    onPointerLeave: () => setActiveKey(null),
  })

  /** Hover highlight background + press-scale feedback for one element. */
  const interactiveStyle = (key: string): React.CSSProperties => {
    const hovered = hoverKey === key
    const active = activeKey === key
    return {
      background: hovered ? `color-mix(in srgb, ${T.label} ${Math.round(hoverAlpha() * 100)}%, transparent)` : 'transparent',
      transform: active ? 'scale(0.96)' : 'scale(1)',
      transition: 'background 120ms ease, transform 90ms ease',
    }
  }

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
  const openBtn: React.CSSProperties = {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    padding: '0 4px',
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: T.labelDim,
    fontFamily: FONT,
    fontSize: '11px',
    lineHeight: '18px',
  }
  const panelBg = `color-mix(in srgb, ${T.bg} ${Math.round(opacity * 100)}%, transparent)`
  /**
   * Toast-bubble note shown after a successful OS-file-manager open (the window
   * may not come to front). Anchors beside the panel (right edge, following its
   * dragged position) so it appears where the user is looking; a solid-ish
   * background and a fade/slide-in make it stand out while keeping the panel's
   * border/radius/font so it still reads as the same plugin.
   */
  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${pos.x + PANEL_WIDTH + 8}px`,
    top: `${pos.y + 8}px`,
    maxWidth: '280px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: `color-mix(in srgb, ${T.bg} 85%, transparent)`,
    border: `1px solid ${T.border}`,
    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
    color: T.label,
    fontFamily: FONT,
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'normal',
    zIndex: 1100,
    pointerEvents: 'none',
    opacity: toastIn ? 1 : 0,
    transform: toastIn ? 'none' : 'translateY(6px)',
    transition: 'opacity 160ms ease, transform 160ms ease',
  }

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
    const hadDrag = dragRef.current !== null
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (hadDrag) {
      panelPos = pos
      savePanelPos(pos)
    }
  }

  return (
    <>
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: T.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ flexShrink: 0, display: 'inline-flex' }}><FolderIcon size={14} /></span>
          <span>目录</span>
        </span>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={String(Math.round(opacity * 100))}
            onChange={(e) => { panelOpacity = Number(e.target.value) / 100; setOpacity(panelOpacity); savePanelOpacity(panelOpacity) }}
            title={`背景透明度 ${Math.round(opacity * 100)}%`}
            style={{ width: '64px', cursor: 'pointer', accentColor: T.label, margin: 0 }}
          />
          <button
            type="button"
            onClick={() => { panelStore.set(false) }}
            {...interactiveHandlers('close')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: hoverKey === 'close' ? T.label : T.labelDim,
              fontSize: '13px',
              padding: '0 2px',
              ...interactiveStyle('close'),
            }}
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
          <span style={{ flex: 1 }} />
          <button
            type="button"
            title="在文件管理器中打开当前文件夹"
            aria-label="在文件管理器中打开"
            onClick={() => { if (visible !== undefined) onOpenDirectory(visible) }}
            {...interactiveHandlers('open:root')}
            style={{
              ...openBtn,
              ...interactiveStyle('open:root'),
              color: hoverKey === 'open:root' ? T.label : T.labelDim,
            }}
          >
            ↗
          </button>
        </div>

        {openError !== undefined && (
          <div style={{ ...childRow, cursor: 'default', color: T.error }}>⚠ {openError}</div>
        )}

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
                <div
                  role="button"
                  tabIndex={0}
                  {...interactiveHandlers('up')}
                  onClick={() => { setPath(undefined) }}
                  style={{ ...childRow, opacity: 0.7, ...interactiveStyle('up') }}
                >
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
                  {...interactiveHandlers(`d:${entry.name}`)}
                  onClick={() => { if (visible !== undefined) setPath(joinPath(visible, entry.name)) }}
                  style={{ ...childRow, ...interactiveStyle(`d:${entry.name}`) }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}><FolderIcon size={14} /></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    title="在文件管理器中打开此文件夹"
                    aria-label="在文件管理器中打开"
                    {...interactiveHandlers(`open:${entry.name}`)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (visible !== undefined) onOpenDirectory(joinPath(visible, entry.name))
                    }}
                    style={{
                      ...openBtn,
                      ...interactiveStyle(`open:${entry.name}`),
                      color: hoverKey === `open:${entry.name}` ? T.label : T.labelDim,
                    }}
                  >
                    ↗
                  </button>
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
    {openNote !== undefined && (
      <div role="status" style={{ ...toastStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <OpenExternalIcon size={13} />
        <span>{openNote}</span>
      </div>
    )}
    </>
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
