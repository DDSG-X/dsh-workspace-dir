/**
 * dsh-workspace-dir — show the current conversation's working directory and
 * its file listing in a draggable directory panel.
 *
 * Client half: reads the session cwd from the sessions list snapshot, then
 * fetches the Host half's JSON route (`/dsh-workspace-dir/list`) for a full
 * file+directory listing. The workspaces service's own `listDirectory` only
 * works when the composed picker serves the `browse` capability, which is not
 * guaranteed — this plugin owns its listing channel instead.
 *
 * UI: a "目录" toggle button in the session header action row
 * (`conversation.session.header.actions`) opens a draggable floating panel in
 * `shell.overlay` with an adjustable background opacity.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the SlotMap merges declaring the header-actions and overlay holes.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { DirectoryPanel, DirectoryToggle } from './DirectoryPanel.tsx'

/** Route pathname the Host half registers (keep in sync with src/index.ts). */
export const LIST_ROUTE = '/dsh-workspace-dir/list'

/** One listing row the Host half returns (lossless JSON only). */
export interface DirEntryJson {
  name: string
  type: 'file' | 'directory' | 'other'
  size?: number
}

/** The JSON response for one directory level. */
export interface ListResultJson {
  path: string
  entries: DirEntryJson[]
  error?: string
}

/** Required services: the slot registry. */
export const inject = ['slots']

/** List one directory level through the Host route; rejects on transport or business error. */
export async function listDirectoryViaHost(path: string, signal?: AbortSignal): Promise<ListResultJson> {
  const url = `${LIST_ROUTE}?path=${encodeURIComponent(path)}`
  const init: RequestInit = {}
  if (signal !== undefined) init.signal = signal
  const response = await fetch(url, init)
  const body = await response.json() as ListResultJson
  if (!response.ok) throw new Error(body.error ?? `list failed (HTTP ${response.status})`)
  if (body.error !== undefined) throw new Error(body.error)
  return body
}

/** The business share this plugin injects into its panel component. */
export interface DirectoryPanelInjected {
  /** List one directory level (absolute path); the signal aborts a superseded scan. */
  listDirectory: (path: string, signal?: AbortSignal) => Promise<ListResultJson>
}

/** Full composed props of the panel component: framework share + injected share. */
export type DirectoryPanelProps = PropsRuntime<'shell.overlay'> & DirectoryPanelInjected

/** Full composed props of the header toggle button. */
export type DirectoryToggleProps = PropsRuntime<'conversation.session.header.actions'>

/**
 * Client plugin body: register the header toggle and the overlay panel through
 * `slots.inject()` because the declaring entries may activate later.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  slots.inject('conversation.session.header.actions', () => slots.register(
    {
      name: 'conversation.session.header.actions',
      id: 'workspace-dir-toggle',
      // After the shipped session actions (agent-preset -10, subagent-catalog 10, job-list 20).
      order: 30,
    },
    DirectoryToggle,
  ))

  slots.inject('shell.overlay', () => slots.register(
    {
      name: 'shell.overlay',
      id: 'workspace-dir-panel',
      order: 10,
      inject: (): DirectoryPanelInjected => ({
        listDirectory: (path, signal) => listDirectoryViaHost(path, signal),
      }),
    },
    DirectoryPanel,
  ))
}

export { DirectoryPanel, DirectoryToggle }
