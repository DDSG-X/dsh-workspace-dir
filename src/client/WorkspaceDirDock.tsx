/**
 * WorkspaceDirDock — the composer-dock cell rendering the current
 * conversation's working directory and one level of its contents.
 *
 * Data flow (all plain JSON, no live Host objects):
 *  - cwd comes from the sessions list snapshot: useSessions(list => list.byId[sessionId]?.cwd)
 *  - the listing comes from the injected Host route call (files + directories)
 *
 * The cell is deliberately small: a one-line cwd readout with a chevron that
 * expands into a compact file list. Files are dimmer than directories; a
 * directory row can be clicked to descend one level (breadcrumb back up).
 */
import { useEffect, useState } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { DirEntryJson, WorkspaceDirDockProps } from './index.ts'

/** Trim a long path to its tail for display, keeping the head for hover. */
function basenameOf(path: string | undefined): string {
  if (path === undefined || path === '') return ''
  const trimmed = path.replace(/[/\\]+$/, '')
  const base = trimmed.split(/[/\\]/).pop()
  return base !== undefined && base !== '' ? base : path
}

/** Friendly label for an entry type. */
function kindLabel(type: DirEntryJson['type']): string {
  if (type === 'directory') return 'dir'
  if (type === 'file') return 'file'
  return 'other'
}

/** Join a directory path with one child basename on either separator flavor. */
function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/'
  return dir.replace(/[/\\]+$/, '') + sep + name
}

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '1px 4px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '12px',
  lineHeight: '20px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}

const NAME_STYLE: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/**
 * The composer-dock cell. Renders null while there is no session cwd
 * (e.g. an ungrouped session) so the dock stays clean.
 */
export function WorkspaceDirDock(props: WorkspaceDirDockProps): React.ReactElement | null {
  const { sessionId, useSessions, listDirectory } = props
  // Snapshot selector: pull the cwd for the active session.
  const cwd = useSessions((list: SessionListState) => list.byId[sessionId]?.cwd)

  const [open, setOpen] = useState(false)
  // The visible directory (undefined = the session cwd); then each descended folder.
  const [path, setPath] = useState<string | undefined>(undefined)
  const [entries, setEntries] = useState<DirEntryJson[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  // Reset navigation when the session's working directory changes.
  useEffect(() => {
    setPath(undefined)
    setError(undefined)
  }, [cwd])

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

  if (cwd === undefined || cwd === '') return null

  const label = basenameOf(visible)
  const directories = (entries ?? []).filter(e => e.type === 'directory')
  const files = (entries ?? []).filter(e => e.type !== 'directory')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div
        role="button"
        tabIndex={0}
        title={visible}
        onClick={() => { setOpen(o => !o) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
        style={{ ...ROW_STYLE, color: 'var(--dsh-fg-1, inherit)' }}
      >
        <span style={{ flexShrink: 0, fontSize: '11px' }}>{open ? '▾' : '▸'}</span>
        <span style={{ flexShrink: 0 }}>{open ? '📂' : '📁'}</span>
        <span style={NAME_STYLE}>{label}</span>
        <span style={{ opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis' }}>{visible}</span>
      </div>

      {open && (
        <div style={{ paddingLeft: '14px' }}>
          {loading && (
            <div style={{ ...ROW_STYLE, opacity: 0.6, cursor: 'default' }}>…</div>
          )}
          {error !== undefined && (
            <div style={{ ...ROW_STYLE, opacity: 0.7, cursor: 'default', color: 'var(--dsh-danger-1, #c0392b)' }}>
              ⚠ {error}
            </div>
          )}
          {!loading && error === undefined && entries !== undefined && (
            <>
              {path !== undefined && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPath(undefined)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPath(undefined) } }}
                  style={{ ...ROW_STYLE, opacity: 0.7 }}
                >
                  <span style={{ flexShrink: 0 }}>↩</span>
                  <span>..</span>
                </div>
              )}
              {directories.map(entry => (
                <div
                  key={`d:${entry.name}`}
                  role="button"
                  tabIndex={0}
                  title={entry.name}
                  onClick={() => { if (visible !== undefined) setPath(joinPath(visible, entry.name)) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (visible !== undefined) setPath(joinPath(visible, entry.name)) } }}
                  style={ROW_STYLE}
                >
                  <span style={{ flexShrink: 0 }}>📁</span>
                  <span style={NAME_STYLE}>{entry.name}</span>
                </div>
              ))}
              {files.map(entry => (
                <div
                  key={`f:${entry.name}`}
                  title={`${entry.name}${entry.size !== undefined ? ` (${entry.size} B)` : ''}`}
                  style={{ ...ROW_STYLE, cursor: 'default', opacity: 0.8 }}
                >
                  <span style={{ flexShrink: 0 }}>📄</span>
                  <span style={NAME_STYLE}>{entry.name}</span>
                  <span style={{ flexShrink: 0, opacity: 0.55 }}>{kindLabel(entry.type)}</span>
                </div>
              ))}
              {entries.length === 0 && (
                <div style={{ ...ROW_STYLE, cursor: 'default', opacity: 0.6 }}>(empty)</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
