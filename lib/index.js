//#region src/index.ts
/** Route pathname this plugin owns. */
const LIST_ROUTE = "/dsh-workspace-dir/list";
/** Read the `path` query parameter from the request URL. */
function queryPath(req) {
	const url = req.url ?? "";
	const index = url.indexOf("?");
	if (index < 0) return void 0;
	const value = new URLSearchParams(url.slice(index + 1)).get("path");
	return value === null ? void 0 : value;
}
/** Write a JSON response with the given status. */
function sendJson(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Required services: the web server carrier and the filesystem provider. */
const inject = ["webServer", "fs"];
/**
* Host plugin body: register the listing route.
* @param ctx - host root context.
*/
function apply(ctx) {
	const webServer = ctx.get("webServer");
	const fs = ctx.get("fs");
	if (webServer === void 0 || fs === void 0) return;
	const route = {
		kind: "exact",
		path: LIST_ROUTE,
		handler: async (req, res) => {
			const path = queryPath(req);
			if (path === void 0 || path === "") {
				sendJson(res, 400, {
					path: "",
					entries: [],
					error: "missing ?path="
				});
				return;
			}
			try {
				const target = await fs.resolve(path);
				sendJson(res, 200, {
					path,
					entries: (await fs.listDir(target)).map((entry) => ({
						name: entry.name,
						type: entry.type,
						...entry.size === void 0 ? {} : { size: entry.size }
					}))
				});
			} catch (error) {
				sendJson(res, 500, {
					path,
					entries: [],
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	};
	ctx.effect(() => webServer.register(route), "dsh-workspace-dir: list route");
}
//#endregion
export { LIST_ROUTE, apply, inject };
