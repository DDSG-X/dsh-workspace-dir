/**
 * WorkspaceDirDock — the composer-dock cell rendering the current
 * conversation's working directory and its directory tree.
 *
 * Data flow (all plain values, no live Host objects):
 *  - cwd comes from the sessions list snapshot: useSessions(list => list.byId[sessionId]?.cwd)
 *  - the tree comes from the injected workspaces.listDirectory call
 *
 * The cell is deliberately small: a one-line cwd readout with a chevron that
 * expands into a compact directory list. A directory row can be clicked to
 * descend one level (breadcrumb back up). The browse capability lists
 * subdirectories only.
 */
import { useEffect, useState } from 'react'
import type { DirectoryEntry, DirectoryListing, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { WorkspaceDirDockProps } from './index.ts'

/** Trim a long path to its tail for display, keeping the head for hover. */
function basenameOf(path: string | undefined): string {
  if (path === undefined || path === '') return ''
  const trimmed = path.replace(/[/\\]+$/, '')
  const base = trimmed.split(/[/\\]/).pop()
  return base !== undefined && base !== '' ? base : path
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

/** One directory level the component has listed. */
interface Level {
  path: string
  listing: DirectoryListing
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
  // The visible directory stack: cwd first, then each descended folder.
  const [stack, setStack] = useState<Level[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // Reset navigation when the session's working directory changes.
  useEffect(() => {
    setStack([])
    setError(undefined)
  }, [cwd])

  // Refresh the visible level whenever the stack or the open state changes.
  useEffect(() => {
    if (!open) return
    const target = stack.length > 0 ? stack[stack.length - 1]!.path : cwd
    if (target === undefined) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    listDirectory(target).then((listing) => {
      if (cancelled) return
      setStack(prev => {
        const next = prev.slice()
        next[next.length - 1] = { path: target, listing }
        return next
      })
      setLoading(false)
    }).catch((reason: unknown) => {
      if (cancelled) return
      setError(reason instanceof Error ? reason.message : String(reason))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, cwd, stack.length, listDirectory])

  if (cwd === undefined || cwd === '') return null

  const displayPath = stack.length > 0 ? stack[stack.length - 1]!.path : cwd
  const listing = stack.length > 0 ? stack[stack.length - 1]!.listing : undefined
  const directories: DirectoryEntry[] = (listing?.entries ?? []).filter(e => !e.hidden)

  const descend = (entry: DirectoryEntry): void => {
    setStack(prev => [...prev, { path: entry.path, listing: { path: entry.path, home: '', crumbs: [], entries: [], truncated: false } }])
  }
  const ascend = (): void => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : []))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div
        role="button"
        tabIndex={0}
        title={displayPath}
        onClick={() => { setOpen(o => !o) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
        style={{ ...ROW_STYLE, color: 'var(--dsh-fg-1, inherit)' }}
      >
        <span style={{ flexShrink: 0, fontSize: '11px' }}>{open ? '▾' : '▸'}</span>
        <span style={{ flexShrink: 0 }}>{open ? '📂' : '📁'}</span>
        <span style={NAME_STYLE}>{basenameOf(displayPath)}</span>
        <span style={{ opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayPath}</span>
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
          {!loading && error === undefined && listing !== undefined && (
            <>
              {stack.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={ascend}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ascend() } }}
                  style={{ ...ROW_STYLE, opacity: 0.7 }}
                >
                  <span style={{ flexShrink: 0 }}>↩</span>
                  <span>..</span>
                </div>
              )}
              {directories.map(entry => (
                <div
                  key={entry.path}
                  role="button"
                  tabIndex={0}
                  title={entry.path}
                  onClick={() => descend(entry)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); descend(entry) } }}
                  style={ROW_STYLE}
                >
                  <span style={{ flexShrink: 0 }}>📁</span>
                  <span style={NAME_STYLE}>{entry.name}</span>
                </div>
              ))}
              {directories.length === 0 && (
                <div style={{ ...ROW_STYLE, cursor: 'default', opacity: 0.6 }}>(empty)</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
