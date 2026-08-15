window.__ModuleLoader__.load({
	id: "dsh-workspace-dir",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/DirectoryPanel.tsx
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
		/**
		* Panel visibility store shared by the toggle button and the overlay panel.
		* Built through a closure factory: methods capture the `store` variable
		* instead of relying on `this`, so React's useSyncExternalStore can call
		* `subscribe(fn)` unbound without losing the listeners set.
		*/
		function createPanelStore() {
			const store = {
				open: false,
				listeners: /* @__PURE__ */ new Set(),
				get() {
					return store.open;
				},
				set(v) {
					store.open = v;
					for (const fn of store.listeners) fn();
				},
				toggle() {
					store.set(!store.open);
				},
				subscribe(fn) {
					store.listeners.add(fn);
					return () => {
						store.listeners.delete(fn);
					};
				}
			};
			return store;
		}
		const panelStore = createPanelStore();
		const PANEL_WIDTH = 280;
		const DEFAULT_POS = {
			x: 272,
			y: 64
		};
		/** localStorage keys for panel UI state (survives harness restarts). */
		const STORE_POS_KEY = "dsw-workspace-dir:panelPos";
		const STORE_OPACITY_KEY = "dsw-workspace-dir:panelOpacity";
		const OPACITY_MIN = 0;
		const OPACITY_MAX = 1;
		/** First-run default: most transparent but still visible (the slider can go down to 0). */
		const OPACITY_DEFAULT = .2;
		/** Read panel position from localStorage; falls back to the default. */
		function loadPanelPos() {
			try {
				const raw = localStorage.getItem(STORE_POS_KEY);
				if (raw === null) return DEFAULT_POS;
				const parsed = JSON.parse(raw);
				if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return DEFAULT_POS;
				return {
					x: Math.max(0, parsed.x),
					y: Math.max(0, parsed.y)
				};
			} catch {
				return DEFAULT_POS;
			}
		}
		/** Persist panel position; failures (e.g. sandboxed iframe) are ignored. */
		function savePanelPos(pos) {
			try {
				localStorage.setItem(STORE_POS_KEY, JSON.stringify(pos));
			} catch {}
		}
		/** Read panel opacity from localStorage; falls back to the default (20%). */
		function loadPanelOpacity() {
			try {
				const raw = localStorage.getItem(STORE_OPACITY_KEY);
				if (raw === null) return OPACITY_DEFAULT;
				const value = Number(raw);
				return Number.isFinite(value) && value >= OPACITY_MIN && value <= OPACITY_MAX ? value : OPACITY_DEFAULT;
			} catch {
				return OPACITY_DEFAULT;
			}
		}
		/** Persist panel opacity; failures are ignored. */
		function savePanelOpacity(opacity) {
			try {
				localStorage.setItem(STORE_OPACITY_KEY, String(opacity));
			} catch {}
		}
		/**
		* Panel UI state persisted across open/close AND harness restarts: module
		* scope seeds from localStorage so the panel reopens where / at what opacity
		* the user left it, instead of resetting every time. Opacity defaults to 20%
		* (most transparent but visible); the slider can go down to 0%.
		*/
		let panelPos = loadPanelPos();
		let panelOpacity = loadPanelOpacity();
		/** Real theme tokens (verified via Theme.listTokens). */
		const T = {
			bg: "var(--dsw-alias-bg-overlay)",
			border: "var(--dsw-alias-border-l1)",
			label: "var(--dsw-alias-label-primary)",
			labelDim: "var(--dsw-alias-label-secondary)",
			error: "var(--dsw-alias-state-error-primary)"
		};
		const FONT = "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif";
		/** Trim a long path to its tail for display, keeping the head for hover. */
		function basenameOf(path) {
			if (path === void 0 || path === "") return "";
			const base = path.replace(/[/\\]+$/, "").split(/[/\\]/).pop();
			return base !== void 0 && base !== "" ? base : path;
		}
		/** Join a directory path with one child basename on either separator flavor. */
		function joinPath(dir, name) {
			const sep = dir.includes("\\") ? "\\" : "/";
			return dir.replace(/[/\\]+$/, "") + sep + name;
		}
		/** Feather-style outline folder icon (24 viewBox, currentColor stroke). */
		function FolderIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				style: { flexShrink: 0 },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })
			});
		}
		/** The "目录" toggle button in the session header action row. */
		function DirectoryToggle(_props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"aria-label": "目录",
				title: "目录",
				onClick: () => {
					panelStore.toggle();
				},
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					height: "28px",
					padding: "0 8px",
					borderRadius: "6px",
					border: "1px solid transparent",
					cursor: "pointer",
					background: useSyncExternalStoreSafe(panelStore.subscribe, panelStore.get) ? `color-mix(in srgb, ${T.label} 12%, transparent)` : "transparent",
					color: T.label,
					fontSize: "13px",
					lineHeight: 1
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "目录" })]
			});
		}
		/** The draggable floating directory panel in shell.overlay. */
		function DirectoryPanel(props) {
			const { useSessions, listDirectory, openDirectory } = props;
			const open = useSyncExternalStoreSafe(panelStore.subscribe, panelStore.get);
			const currentId = useSessions((s) => s.current);
			const byId = useSessions((s) => s.byId ?? {});
			const cwd = currentId !== void 0 ? byId[currentId]?.cwd : void 0;
			const [path, setPath] = (0, react.useState)(void 0);
			const [entries, setEntries] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const [openError, setOpenError] = (0, react.useState)(void 0);
			/** Hovered / pressed interactive element key (feedback state). */
			const [hoverKey, setHoverKey] = (0, react.useState)(null);
			const [activeKey, setActiveKey] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [pos, setPos] = (0, react.useState)(panelPos);
			const [opacity, setOpacity] = (0, react.useState)(panelOpacity);
			const dragRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setPath(void 0);
				setError(void 0);
				setOpenError(void 0);
			}, [cwd]);
			const visible = path ?? cwd;
			/** Open a directory in the OS file manager; surface failures inline. */
			const onOpenDirectory = (target) => {
				setOpenError(void 0);
				openDirectory(target).catch((reason) => {
					setOpenError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			/**
			* Hover-highlight alpha: shift the panel's background opacity by ±20% so the
			* hovered clickable area stands out — brighter on transparent panels (≤50%),
			* fainter on opaque ones (>50%); restoring on mouse leave.
			*/
			const hoverAlpha = () => opacity <= .5 ? Math.min(1, opacity + .2) : Math.max(0, opacity - .2);
			/** Pointer/mouse feedback handlers keyed per interactive element. */
			const interactiveHandlers = (key) => ({
				onMouseEnter: () => setHoverKey(key),
				onMouseLeave: () => setHoverKey(null),
				onPointerDown: () => setActiveKey(key),
				onPointerUp: () => setActiveKey(null),
				onPointerLeave: () => setActiveKey(null)
			});
			/** Hover highlight background + press-scale feedback for one element. */
			const interactiveStyle = (key) => {
				const hovered = hoverKey === key;
				const active = activeKey === key;
				return {
					background: hovered ? `color-mix(in srgb, ${T.label} ${Math.round(hoverAlpha() * 100)}%, transparent)` : "transparent",
					transform: active ? "scale(0.96)" : "scale(1)",
					transition: "background 120ms ease, transform 90ms ease"
				};
			};
			(0, react.useEffect)(() => {
				if (!open || visible === void 0) return;
				let cancelled = false;
				setLoading(true);
				setError(void 0);
				listDirectory(visible).then((result) => {
					if (cancelled) return;
					setEntries(result.entries);
					setLoading(false);
				}).catch((reason) => {
					if (cancelled) return;
					setError(reason instanceof Error ? reason.message : String(reason));
					setEntries(void 0);
					setLoading(false);
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				visible,
				listDirectory
			]);
			if (!open || cwd === void 0 || cwd === "") return null;
			const dirs = (entries ?? []).filter((e) => e.type === "directory");
			const files = (entries ?? []).filter((e) => e.type !== "directory");
			const row = {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				padding: "3px 8px",
				borderRadius: "4px",
				cursor: "pointer",
				fontFamily: FONT,
				fontSize: "12px",
				lineHeight: "22px",
				whiteSpace: "nowrap",
				overflow: "hidden",
				color: T.label
			};
			const childRow = {
				...row,
				paddingLeft: "22px"
			};
			const openBtn = {
				flexShrink: 0,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				minWidth: "20px",
				padding: "0 4px",
				borderRadius: "4px",
				border: "none",
				background: "transparent",
				cursor: "pointer",
				color: T.labelDim,
				fontFamily: FONT,
				fontSize: "11px",
				lineHeight: "18px"
			};
			const panelBg = `color-mix(in srgb, ${T.bg} ${Math.round(opacity * 100)}%, transparent)`;
			const onPointerDown = (e) => {
				dragRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					originX: pos.x,
					originY: pos.y
				};
				e.currentTarget.setPointerCapture(e.pointerId);
			};
			const onPointerMove = (e) => {
				const d = dragRef.current;
				if (d === null) return;
				setPos({
					x: d.originX + (e.clientX - d.startX),
					y: d.originY + (e.clientY - d.startY)
				});
			};
			const onPointerUp = (e) => {
				const hadDrag = dragRef.current !== null;
				dragRef.current = null;
				e.currentTarget.releasePointerCapture(e.pointerId);
				if (hadDrag) {
					panelPos = pos;
					savePanelPos(pos);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					position: "fixed",
					left: `${pos.x}px`,
					top: `${pos.y}px`,
					width: `${PANEL_WIDTH}px`,
					maxHeight: "70vh",
					display: "flex",
					flexDirection: "column",
					background: panelBg,
					border: `1px solid ${T.border}`,
					borderRadius: "10px",
					boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
					zIndex: 1e3,
					overflow: "hidden",
					pointerEvents: "auto",
					color: T.label,
					fontFamily: FONT
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					onPointerDown,
					onPointerMove,
					onPointerUp,
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						padding: "6px 8px 6px 12px",
						cursor: "move",
						userSelect: "none",
						borderBottom: `1px solid ${T.border}`
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: "12px",
							fontWeight: 600,
							color: T.label,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: "📁 目录"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "6px"
						},
						onPointerDown: (e) => e.stopPropagation(),
						onPointerMove: (e) => e.stopPropagation(),
						onPointerUp: (e) => e.stopPropagation(),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "range",
							min: "0",
							max: "100",
							step: "5",
							value: String(Math.round(opacity * 100)),
							onChange: (e) => {
								panelOpacity = Number(e.target.value) / 100;
								setOpacity(panelOpacity);
								savePanelOpacity(panelOpacity);
							},
							title: `背景透明度 ${Math.round(opacity * 100)}%`,
							style: {
								width: "64px",
								cursor: "pointer",
								accentColor: T.label,
								margin: 0
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								panelStore.set(false);
							},
							...interactiveHandlers("close"),
							style: {
								border: "none",
								background: "transparent",
								cursor: "pointer",
								color: hoverKey === "close" ? T.label : T.labelDim,
								fontSize: "13px",
								padding: "0 2px",
								...interactiveStyle("close")
							},
							"aria-label": "关闭",
							children: "✕"
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "6px 8px",
						overflowY: "auto",
						minHeight: "40px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							title: visible,
							style: {
								...row,
								cursor: "default"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										flexShrink: 0,
										display: "inline-flex"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { size: 14 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										overflow: "hidden",
										textOverflow: "ellipsis"
									},
									children: basenameOf(visible)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: T.labelDim,
										overflow: "hidden",
										textOverflow: "ellipsis"
									},
									children: visible
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									title: "在文件管理器中打开当前文件夹",
									"aria-label": "在文件管理器中打开",
									onClick: () => {
										if (visible !== void 0) onOpenDirectory(visible);
									},
									...interactiveHandlers("open:root"),
									style: {
										...openBtn,
										...interactiveStyle("open:root"),
										color: hoverKey === "open:root" ? T.label : T.labelDim
									},
									children: "↗"
								})
							]
						}),
						openError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...childRow,
								cursor: "default",
								color: T.error
							},
							children: ["⚠ ", openError]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								borderTop: `1px solid ${T.border}`,
								marginTop: "4px",
								paddingTop: "4px"
							},
							children: [
								loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...childRow,
										cursor: "default",
										opacity: .6
									},
									children: "…"
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...childRow,
										cursor: "default",
										color: T.error
									},
									children: ["⚠ ", error]
								}),
								!loading && error === void 0 && entries !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									path !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										role: "button",
										tabIndex: 0,
										...interactiveHandlers("up"),
										onClick: () => {
											setPath(void 0);
										},
										style: {
											...childRow,
											opacity: .7,
											...interactiveStyle("up")
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { flexShrink: 0 },
											children: "↩"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ".." })]
									}),
									dirs.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										role: "button",
										tabIndex: 0,
										title: entry.name,
										...interactiveHandlers(`d:${entry.name}`),
										onClick: () => {
											if (visible !== void 0) setPath(joinPath(visible, entry.name));
										},
										style: {
											...childRow,
											...interactiveStyle(`d:${entry.name}`)
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													flexShrink: 0,
													display: "inline-flex"
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { size: 14 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													overflow: "hidden",
													textOverflow: "ellipsis"
												},
												children: entry.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												title: "在文件管理器中打开此文件夹",
												"aria-label": "在文件管理器中打开",
												...interactiveHandlers(`open:${entry.name}`),
												onClick: (e) => {
													e.stopPropagation();
													if (visible !== void 0) onOpenDirectory(joinPath(visible, entry.name));
												},
												style: {
													...openBtn,
													...interactiveStyle(`open:${entry.name}`),
													color: hoverKey === `open:${entry.name}` ? T.label : T.labelDim
												},
												children: "↗"
											})
										]
									}, `d:${entry.name}`)),
									files.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										title: `${entry.name}${entry.size !== void 0 ? ` (${entry.size} B)` : ""}`,
										style: {
											...childRow,
											cursor: "default",
											opacity: .8
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { flexShrink: 0 },
											children: "📄"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												overflow: "hidden",
												textOverflow: "ellipsis"
											},
											children: entry.name
										})]
									}, `f:${entry.name}`)),
									entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											...childRow,
											cursor: "default",
											opacity: .6
										},
										children: "(empty)"
									})
								] })
							]
						})
					]
				})]
			});
		}
		/**
		* useSyncExternalStore wrapper that tolerates environments without the hook
		* (falls back to reading the store directly; the overlay is re-rendered by
		* the dispatching skeleton anyway).
		*/
		function useSyncExternalStoreSafe(subscribe, getSnapshot) {
			const hook = react.useSyncExternalStore;
			if (hook !== void 0) return hook(subscribe, getSnapshot);
			const [, force] = (0, react.useState)(0);
			(0, react.useEffect)(() => subscribe(() => force((n) => n + 1)), [subscribe]);
			return getSnapshot();
		}
		//#endregion
		//#region src/client/index.ts
		/** Route pathname the Host half registers (keep in sync with src/index.ts). */
		const LIST_ROUTE = "/dsh-workspace-dir/list";
		/** Required services: the slot registry. */
		const inject = ["slots"];
		/** List one directory level through the Host route; rejects on transport or business error. */
		async function listDirectoryViaHost(path, signal) {
			const url = `${LIST_ROUTE}?path=${encodeURIComponent(path)}`;
			const init = {};
			if (signal !== void 0) init.signal = signal;
			const response = await fetch(url, init);
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? `list failed (HTTP ${response.status})`);
			if (body.error !== void 0) throw new Error(body.error);
			return body;
		}
		/** Open one directory in the OS file manager through the official host.openPath hand-off. */
		async function openDirectoryViaWorkspaces(ctx, path) {
			const workspaces = ctx.get("workspaces");
			if (workspaces === void 0) throw new Error("workspaces 服务不可用");
			await workspaces.openPath(path);
		}
		/**
		* Client plugin body: register the header toggle and the overlay panel through
		* `slots.inject()` because the declaring entries may activate later.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			slots.inject("conversation.session.header.actions", () => slots.register({
				name: "conversation.session.header.actions",
				id: "workspace-dir-toggle",
				order: 30
			}, DirectoryToggle));
			slots.inject("shell.overlay", () => slots.register({
				name: "shell.overlay",
				id: "workspace-dir-panel",
				order: 10,
				inject: () => ({
					listDirectory: (path, signal) => listDirectoryViaHost(path, signal),
					openDirectory: (path) => openDirectoryViaWorkspaces(ctx, path)
				})
			}, DirectoryPanel));
		}
		//#endregion
		exports.DirectoryPanel = DirectoryPanel;
		exports.DirectoryToggle = DirectoryToggle;
		exports.LIST_ROUTE = LIST_ROUTE;
		exports.apply = apply;
		exports.inject = inject;
		exports.listDirectoryViaHost = listDirectoryViaHost;
		exports.openDirectoryViaWorkspaces = openDirectoryViaWorkspaces;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map