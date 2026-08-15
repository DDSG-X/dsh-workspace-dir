/**
 * dsh-workspace-dir — Host half.
 *
 * Registers one JSON route on the web server that lists a directory through
 * the `fs` service (files AND subdirectories, with type and size). The Client
 * half fetches this route from the browser.
 *
 * Route: GET /dsh-workspace-dir/list?path=<absolute>
 * Response: { path, entries: [{ name, type, size }] } or { error }
 */
import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'

/** Route pathname this plugin owns. */
export const LIST_ROUTE = '/dsh-workspace-dir/list'

/** One listing row returned over the wire (lossless JSON only). */
export interface DirEntryJson {
  name: string
  type: 'file' | 'directory' | 'other'
  size?: number
}

/** The JSON response shape for one directory level. */
export interface ListResultJson {
  path: string
  entries: DirEntryJson[]
  error?: string
}

/** Read the `path` query parameter from the request URL. */
function queryPath(req: { url?: string }): string | undefined {
  const url = req.url ?? ''
  const index = url.indexOf('?')
  if (index < 0) return undefined
  const params = new URLSearchParams(url.slice(index + 1))
  const value = params.get('path')
  return value === null ? undefined : value
}

/** Write a JSON response with the given status. */
function sendJson(res: { writeHead: (status: number, headers: Record<string, string>) => void; end: (body: string) => void }, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Required services: the web server carrier and the filesystem provider. */
export const inject = ['webServer', 'fs']

/**
 * Host plugin body: register the listing route.
 * @param ctx - host root context.
 */
export function apply(ctx: Context): void {
  const webServer = ctx.get('webServer')
  const fs = ctx.get('fs')
  if (webServer === undefined || fs === undefined) return

  const route: WebRoute = {
    kind: 'exact',
    path: LIST_ROUTE,
    handler: async (req, res) => {
      const path = queryPath(req)
      if (path === undefined || path === '') {
        sendJson(res, 400, { path: '', entries: [], error: 'missing ?path=' })
        return
      }
      try {
        const target = await fs.resolve(path)
        const entries = await fs.listDir(target)
        sendJson(res, 200, {
          path,
          entries: entries.map((entry: { name: string; type: 'file' | 'directory' | 'other'; size?: number }) => ({
            name: entry.name,
            type: entry.type,
            ...(entry.size === undefined ? {} : { size: entry.size }),
          })),
        })
      } catch (error) {
        sendJson(res, 500, {
          path,
          entries: [],
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }
  ctx.effect(() => webServer.register(route), 'dsh-workspace-dir: list route')
}
