/**
 * dsh-workspace-dir — show the current conversation's working directory and
 * its file listing inside the web composer dock.
 *
 * Client half: reads the session cwd from the sessions list snapshot, then
 * fetches the Host half's JSON route (`/dsh-workspace-dir/list`) for a full
 * file+directory listing. The workspaces service's own `listDirectory` only
 * works when the composed picker serves the `browse` capability, which is not
 * guaranteed — this plugin owns its listing channel instead.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the SlotMap merge declaring the composer.dock hole.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { WorkspaceDirDock } from './WorkspaceDirDock.tsx'

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

/**
 * Client plugin body: register the dock entry through `slots.inject()` because
 * the ui-conversation entry may activate later or replace its declaration.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  slots.inject('conversation.composer.dock', () => slots.register(
    {
      name: 'conversation.composer.dock',
      id: 'workspace-dir',
      // Sit after the shipped stats line (order 0).
      order: 10,
      inject: (): WorkspaceDirInjected => ({
        listDirectory: (path, signal) => listDirectoryViaHost(path, signal),
      }),
    },
    WorkspaceDirDock,
  ))
}

/** The business share this plugin injects into its dock component. */
export interface WorkspaceDirInjected {
  /** List one directory level (absolute path); the signal aborts a superseded scan. */
  listDirectory: (path: string, signal?: AbortSignal) => Promise<ListResultJson>
}

/** Full composed props of the dock component: framework share + injected share. */
export type WorkspaceDirDockProps = PropsRuntime<'conversation.composer.dock'> & WorkspaceDirInjected

export { WorkspaceDirDock }
