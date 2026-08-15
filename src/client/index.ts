/**
 * dsh-workspace-dir — show the current conversation's working directory and
 * its directory tree inside the web composer dock.
 *
 * Pure client plugin, no host half: the cwd comes from the sessions list
 * snapshot (`useSessions(list => list.byId[sessionId]?.cwd)`) and the
 * directory tree comes from the workspaces service's `listDirectory` (the
 * same browse capability the shipped workspace picker uses). Note: that
 * capability lists subdirectories only — it is a directory picker, not a
 * file browser — so this cell shows the working directory and its folder
 * tree.
 */
import type { ClientContext, DirectoryListing } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the SlotMap merge declaring the composer.dock hole.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { WorkspaceDirDock } from './WorkspaceDirDock.tsx'

/** Required services: the slot registry and the wire-facing workspace service. */
export const inject = ['slots', 'workspaces']

/** The business share this plugin injects into its dock component. */
export interface WorkspaceDirInjected {
  /** List one directory level (absent path = host home); the signal aborts a superseded scan. */
  listDirectory: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>
}

/** Full composed props of the dock component: framework share + injected share. */
export type WorkspaceDirDockProps = PropsRuntime<'conversation.composer.dock'> & WorkspaceDirInjected

/**
 * Client plugin body: register the dock entry through `slots.inject()` because
 * the ui-conversation entry may activate later or replace its declaration.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  const workspaces = ctx.get('workspaces')
  if (slots === undefined || workspaces === undefined) return

  slots.inject('conversation.composer.dock', () => slots.register(
    {
      name: 'conversation.composer.dock',
      id: 'workspace-dir',
      // Sit after the shipped stats line (order 0).
      order: 10,
      inject: (): WorkspaceDirInjected => ({
        listDirectory: (path, signal) => workspaces.listDirectory(path, signal),
      }),
    },
    WorkspaceDirDock,
  ))
}

export { WorkspaceDirDock }
