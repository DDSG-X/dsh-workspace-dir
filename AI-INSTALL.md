# AI 安装引导 (AI-INSTALL.md · 中英双语 / Bilingual)

> 本文件是**中英双语单文件引导**:中文版在前(到 `## 完成后` 结束),英文版在后
> (从下方 `# English Guide` 开始)。AI 按自己/用户的语言读取对应部分即可。
>
> This file is a single bilingual install guide: the Chinese guide comes first
> (it ends at `## 完成后`), the English guide follows below (it starts at the
> `# English Guide` heading). Read the section matching your/user's language.

---

## 目标

把 `dsh-workspace-dir` 插件安装到用户的 DeepSeek Harness Web UI,使其在会话头部出现"目录"按钮,点击弹出可拖动、透明度可调的目录面板。

## 第 0 步:确认工作目录

如果本仓库**还没有克隆到本机**(用户让你直接克隆),先把它克隆到**英文路径**
(中文路径会导致 pnpm 乱码),例如用户主目录或 `D:\` 下:

```sh
git clone https://github.com/DDSG-X/dsh-workspace-dir.git
cd dsh-workspace-dir
```

然后确认你在哪个目录:

```sh
pwd
ls
```

本仓库应包含:`src/`、`lib/`(构建产物,已入库)、`package.json`、`tsdown.config.ts`、`AI-INSTALL.md`。

## 第 1 步:检测 harness 运行环境(关键分叉)

用户可能有两种 harness 安装方式,安装路径不同。检测顺序:

```sh
# 1) dsh 命令在哪(源码运行与 npm 安装都可能有)
dsh --version 2>/dev/null || pnpm dsh --version 2>/dev/null || npm ls -g @deepseek-ai/dsh 2>/dev/null

# 2) 常见源码 checkout 位置(按需扩展探测)
for d in ~/deepseek-harness ~/code/deepseek-harness ~/src/deepseek-harness /opt/deepseek-harness; do
  [ -f "$d/package.json" ] && echo "SOURCE_CHECKOUT_FOUND: $d"
done

# 3) web profile 存在?
ls ~/.dsh/profiles/web/package.json 2>/dev/null && echo "PROFILE_EXISTS"
```

- 若检测到源码 checkout → 记下 `HARNESS_SRC`(下面第 3 步重启要用);
- 若什么都没检测到 → **不要猜路径,直接问用户**:harness 源码目录在哪?web profile 是否已初始化(跑过一次 `dsh web`)?
- **只检测到 npm 安装的 dsh(没有源码 checkout)** → 如实告知用户:本插件的 peer 依赖由
  harness 源码仓库提供(部分为 vendored),npm 上不完整,**npm 安装版 harness 暂不支持**;
  建议按官方 README 从源码运行 harness(克隆 deepseek-harness 仓库 → `pnpm install` →
  `pnpm dsh web`)后再回来装本插件。不要尝试硬装。
- 若 `PROFILE_EXISTS` 不存在,提示用户先跑一次 `dsh web` 生成 profile。

## 第 2 步:安装到 web profile(核心,无构建)

> 原理:插件是 out-of-tree 插件,依赖 profile 的 hoisted linker。profile 的
> `pnpm-workspace.yaml` 由 `dsh` 自动生成,含 `nodeLinker: hoisted` 与
> `autoInstallPeers: false`,所以插件的 peer 依赖(`@deepseek-ai/*`、`react`)在
> 运行时由 harness 安装提供,安装阶段**不需要**也从 npm 解析它们。
>
> ⚠️ **本项目未发布到 npm**:安装必须用 `file:` 指向**本地克隆目录**。
> 不要尝试 `dsh plugin add dsh-workspace-dir` 或 `npm install dsh-workspace-dir`
> (npm 上找不到该包,会失败)。

1. 用 harness 的插件管理命令把本仓库加为 profile 依赖(自动写 `package.json`):

```sh
dsh plugin --profile web add file:<本仓库绝对路径>
```

> 若 `dsh plugin` 不可用(命令不存在/报错),退回手动方式:
> 编辑 `~/.dsh/profiles/web/package.json`,在 `dependencies` 加
> `"dsh-workspace-dir": "file:<本仓库绝对路径>"`,然后在 profile 目录 `pnpm install`。

2. 编辑 `~/.dsh/profiles/web/cordis.patch.yml`,追加(必须,`dsh plugin add` 不会写这行):

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

3. 若第 1 步是手动方式,在 profile 目录安装:

```sh
cd ~/.dsh/profiles/web
pnpm install
```

**验证**:`ls ~/.dsh/profiles/web/node_modules/dsh-workspace-dir/lib/` 应包含 `index.js` 和 `client.js`。
**失败处理**:
- `dsh plugin add` 报 pnpm 找不到 → 提示用户先安装 pnpm(或按手动方式走);
- `pnpm install` 报 peer 版本解析错误 → 检查 profile 的 `pnpm-workspace.yaml` 是否被改坏
  (应有 `autoInstallPeers: false`);若用户自建了 profile 缺这项,补上再装;
- 任何一步报中文路径乱码(`鎻掍欢` 之类)→ 本仓库/用户工作区必须在英文路径,提示用户迁移后再继续。

## 第 3 步:验证安装(必须)

1. **重启 harness**:
   - 问用户是否有启动器(如 `harness-launcher`),有则重启它;
   - 否则在 harness 源码目录跑 `pnpm dsh web`,等端口 3080 就绪。

2. **功能验证**(重启后):
   - 打开任意会话 → 会话标题旁应出现 **"目录"** 按钮;
   - 点击 → 弹出浮动目录面板,显示当前工作目录及文件/子目录;
   - 拖动标题栏移动面板;滑杆调透明度;`✕` 关闭。

**失败处理**:
- 按钮不出现 → 检查 profile 的依赖和 cordis.patch.yml 是否都生效(`pnpm list --dir ~/.dsh/profiles/web` 看依赖);
- 面板报错 → 查看 harness 启动日志或浏览器控制台,重点看 `dsh-workspace-dir/list` 路由是否注册(可用 `curl http://127.0.0.1:3080/dsh-workspace-dir/list?path=<绝对路径>` 测试)。

## 故障排查速查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 按钮不出现 | 插件未加载 | 检查 profile 依赖 + patch 行 + 重启 |
| `list` 路由 404 | Host 半未加载 | 检查 patch 行 `name: dsh-workspace-dir` 拼写 |
| `dsh plugin add` 报包找不到 | 用了包名而非本地路径 | 用 `file:<本地克隆路径>`(本项目未发布 npm) |
| `pnpm install` 报 peer 版本 | profile 的 `autoInstallPeers` 被改 | 恢复 `autoInstallPeers: false`(由 dsh 生成) |
| 展开报 `directory browse failed` | 用了旧版代码 | 重新克隆或重新构建(见文末) |
| 路径出现乱码字符 | 中文路径 | 迁移到英文路径 |

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `workspace-dir` 行;
2. `dsh plugin --profile web remove dsh-workspace-dir`(或手动从 profile 的 `package.json` 删除依赖后 `pnpm install`);
3. 重启 harness。

---

## 开发/排错经验(重要,勿重蹈)

### 1. 浏览器报 `Cannot read properties of undefined (reading 'add')` at subscribe

- **根因**:`panelStore` 若用对象方法简写(`get() { return this.open }`)依赖 `this`,而 React 的
  `useSyncExternalStore` 是**解绑调用** `subscribe(fn)`——`this` 为 `undefined`,`this.listeners` 即
  `undefined`,`.add()` 崩溃。头部按钮与浮动面板共用此 store,两个 slot 都会渲染失败被退役。
- **修复**:用闭包工厂,方法捕获 `store` 变量而非 `this`:

  ```ts
  function createPanelStore(): PanelStore {
    const store = { /* ... */ get() { return store.open } /* ... */ }
    return store
  }
  const panelStore = createPanelStore()
  ```

- **排查线索**:slot 已注册但 `active: false`(被 abdicated);浏览器控制台有
  `slot entry crashed in '...'` + TypeError 堆栈。

### 2. 中文路径会乱码

`D:\Projects\插件` 这类中文路径在 pnpm 里会变成 `鎻掍欢`,导致 pnpm install 卡死/失败。
**项目必须放在英文路径下**。若用户的工作区是中文路径,提示先迁移到英文目录再继续。

### 3. 构建环境(沙箱/离线场景)

- 构建只需要 `tsdown`(仓库 devDependencies 里只有 tsdown、react、@types/react;
  `@deepseek-ai/*` 只在运行时由 harness 提供,不参与构建)。
- 无网络时不要跑 `pnpm install`;若 `node_modules` 不在仓库内,可从已有的安装源
  目录复制,或用 junction 指向已有 `node_modules`(内含 tsdown),然后:

  ```sh
  node node_modules/tsdown/dist/run.mjs      # 生成 lib/index.js + lib/client.js
  ```

- **改了源码记得重新构建并提交 `lib/`**(本仓库把构建产物入库,克隆即用)。

### 4. 安装源更新：用 git pull，不要手动复制文件

- 正式安装源与开发仓库分离时（如安装源 `D:\Software\dsh_plugins\dsh-workspace-dir`、
  开发源 `D:\Projects\plugins\dsh-workspace-dir`），安装源**本身是 git 克隆**：
  **先改开发源并提交+push，再在安装源 `git pull`**——构建产物 `lib/` 已入库，拉取即用，
  无需构建、无需 robocopy 复制。
- profile 的 `node_modules/dsh-workspace-dir` 若是 **junction**，pull 到新 lib 后刷新页面即生效
  （`clientModules` 按内容 hash 提供 bundle，自动更新 rev）；若是实体副本则需重新安装。

### 5. 面板 UI 状态持久化约定（打开状态 + 位置 + 透明度）

- 面板打开/关闭状态、位置、透明度都应**跨 harness 重启记住**；默认透明度 20%（滑杆 **0%–100%**，0% 即完全透明背景）、默认位置 `{x:272,y:64}`、默认关闭。
- 实现：localStorage 三个键——`dsw-workspace-dir:panelOpen`（`'1'`/`'0'`）、`dsw-workspace-dir:panelPos`（JSON `{x,y}`）、`dsw-workspace-dir:panelOpacity`（数字）；
  模块加载时读入（`loadPanelOpen`/`loadPanelPos`/`loadPanelOpacity`，带 try/catch——沙箱 iframe 可能禁用 localStorage，失败退回默认）；
  打开状态在 store 的 `set()` 里写回、位置在拖动结束（`onPointerUp`）写回、透明度在滑杆 `onChange` 写回；组件 state 用模块变量初始化。
- 不要用组件内 `useState(默认值)` 初值（会每次重置）。

### 5a. 可点击区域交互反馈约定（悬停高亮 + 按下缩放）

- 悬停：可点击区域（目录行/↗/关闭）背景 = label 色 `hoverAlpha` 混合，`hoverAlpha = 面板透明度 ± 0.2`
  （面板 ≤50% 时 +0.2 更明显，>50% 时 −0.2），`onMouseLeave` 恢复；不要用 CSS 文件，保持内联样式风格。
- 按下：`transform: scale(0.96)` 视觉缩小、松开恢复（用缩放模拟"字体缩小放大"，避免字号变化引起布局跳动），
  `transition: background 120ms ease, transform 90ms ease`。
- 实现：组件内 `hoverKey`/`activeKey` 两个 state + `interactiveHandlers(key)`/`interactiveStyle(key)` 两个辅助函数，按元素 key 分发。

### 6. 打开系统文件夹:用官方 `host.openPath`,不要自己拼命令

- 客户端 `ctx.workspaces.openPath(<绝对路径>)` → Host 侧 `host.openPath`:
  Windows 用 `Invoke-Item`(资源管理器)、macOS `open`、桌面 Linux `xdg-open`,
  WSL 自动 `wslpath -w` 转成 Windows 路径再交给 `Invoke-Item`。
- 无头/容器 Linux 会被 `canOpenPath` 判定不可达并 reject——面板把错误内联显示,
  不需要隐藏按钮逻辑。
- **不要**自己用 shell 服务拼 `explorer`/`open`/`xdg-open`:平台差异、WSL 路径转换、
  沙箱策略都容易出错,官方 opener 全部处理好了。
- 客户端类型:`IWorkspaces` 从 `@deepseek-ai/dsh-client-runtime/client` 导出,
  用 `ctx.get('workspaces')` 获取(可选服务,判空)。

## 完成后

- 向用户报告:安装成功、在哪里看到了"目录"按钮、如何卸载;
- 若遇到本文件未覆盖的问题,把错误信息带回,供维护者更新本引导。

---

# English Guide

> The Chinese version of this guide is above; this English section is the
> equivalent, self-contained guide. (上方为中文版,本节为英文版,内容一致。)

This document is written for an **AI agent** (DeepSeek Harness or another
coding agent), not for a human to follow manually. Once the user opens this
repository as a workspace, read the section below and follow the steps to
install the plugin automatically.

**The user is likely a complete newcomer to this plugin — and to installing
plugins at all.** Therefore:
- Do not assume the user is technical — briefly tell them what you are about
  to do (detect environment → install into the profile → restart → verify);
- Before modifying `~/.dsh/profiles/web`, explain and get the user's approval
  (your write access requires their confirmation);
- If the user cannot answer a question (e.g. "where is the harness source?"),
  do not keep asking — fall back to the ready-made path in Step 1.

Your access: this repository directory (writable), the harness source
checkout (usually readable), and `~/.dsh/profiles/web` (writes require user
approval). Every step has a **verify** and a **failure handling** clause —
execute them in order, never skip verification.

This repository **ships its build artifacts** (`lib/`), so installation does
not require a build. Building is only relevant for developers changing the
source (see "Development / debugging lessons" at the end).

## Goal

Install the `dsh-workspace-dir` plugin into the user's DeepSeek Harness Web
UI so a **"目录" (Directory)** button appears in the session header, opening a
draggable directory panel with adjustable background opacity.

## Step 0: Confirm the working directory

If this repository is **not cloned on this machine yet** (the user asked you to
clone it directly), clone it to an **English path** (Chinese paths garble under
pnpm), e.g. the user's home directory or `D:\`:

```sh
git clone https://github.com/DDSG-X/dsh-workspace-dir.git
cd dsh-workspace-dir
```

Then check where you are:

```sh
pwd
ls
```

This repository should contain: `src/`, `lib/` (build artifacts, committed),
`package.json`, `tsdown.config.ts`, and this file.

## Step 1: Detect the harness environment (critical fork)

Users may run the harness in different ways and the paths differ. Detect in
this order:

```sh
# 1) Where is the dsh command? (both source checkouts and npm installs may have it)
dsh --version 2>/dev/null || pnpm dsh --version 2>/dev/null || npm ls -g @deepseek-ai/dsh 2>/dev/null

# 2) Common source-checkout locations (extend the list as needed)
for d in ~/deepseek-harness ~/code/deepseek-harness ~/src/deepseek-harness /opt/deepseek-harness; do
  [ -f "$d/package.json" ] && echo "SOURCE_CHECKOUT_FOUND: $d"
done

# 3) Does the web profile exist?
ls ~/.dsh/profiles/web/package.json 2>/dev/null && echo "PROFILE_EXISTS"
```

- If a source checkout is found → remember it as `HARNESS_SRC` (needed for the
  restart in Step 3);
- If nothing is found → **do not guess paths; ask the user directly**: where is
  the harness source? Is the web profile initialized (has `dsh web` been run once)?
- **Only an npm-installed `dsh` was found (no source checkout)** → tell the user
  honestly: this plugin's peer deps are provided by the harness source repo (some
  are vendored) and are incomplete on npm, so an **npm-installed harness is not
  supported yet**; recommend switching to a source checkout of the harness (clone
  the deepseek-harness repo → `pnpm install` → `pnpm dsh web` per the official
  README) and then come back to install this plugin. Do not force the install.
- If `PROFILE_EXISTS` is missing, ask the user to run `dsh web` once to create the profile.

## Step 2: Install into the web profile (core step, no build)

> Why this works: the plugin is an **out-of-tree plugin** relying on the
> profile's hoisted linker. The profile's `pnpm-workspace.yaml` is generated by
> `dsh` with `nodeLinker: hoisted` and `autoInstallPeers: false`, so the
> plugin's peer deps (`@deepseek-ai/*`, `react`) are provided at runtime by the
> harness installation — they are **not** resolved from npm at install time.
>
> ⚠️ **This project is NOT published to npm**: you must install it with a
> `file:` spec pointing at the **local clone**. Do not try
> `dsh plugin add dsh-workspace-dir` or `npm install dsh-workspace-dir` — the
> package does not exist on the registry and those will fail.

1. Add this repo as a profile dependency with the harness plugin command
   (writes `package.json` automatically):

```sh
dsh plugin --profile web add file:<absolute path to this repo>
```

> If `dsh plugin` is unavailable, fall back to the manual way: edit
> `~/.dsh/profiles/web/package.json`, add
> `"dsh-workspace-dir": "file:<absolute path to this repo>"` to `dependencies`,
> then run `pnpm install` in the profile directory.

2. Edit `~/.dsh/profiles/web/cordis.patch.yml` and append (required —
   `dsh plugin add` does not write this row):

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

3. If you took the manual path in step 1, install in the profile directory:

```sh
cd ~/.dsh/profiles/web
pnpm install
```

**Verify**: `ls ~/.dsh/profiles/web/node_modules/dsh-workspace-dir/lib/` should
contain `index.js` and `client.js`.
**Failure handling**:
- `dsh plugin add` says pnpm is missing → ask the user to install pnpm (or use the manual way);
- `pnpm install` reports a peer version error → check whether the profile's
  `pnpm-workspace.yaml` was corrupted (it should contain `autoInstallPeers: false`);
  if the user hand-built the profile without it, add it and retry;
- Garbled Chinese characters in any path (e.g. `鎻掍欢`) → the repo/user
  workspace must live on an English path; ask the user to migrate before continuing.

## Step 3: Verify the install (mandatory)

1. **Restart the harness**:
   - Ask whether the user has a launcher (e.g. `harness-launcher`); if so, restart it;
   - Otherwise run `pnpm dsh web` in the harness source and wait for port 3080.

2. **Functional verification** (after restart):
   - Open any session → a **"目录"** button should appear beside the session title;
   - Click it → a floating directory panel shows the current working directory
     and its files/subdirectories;
   - Drag the header bar to move the panel; use the slider to adjust opacity;
     `✕` closes it.

**Failure handling**:
- Button missing → check that the profile dependency and the `cordis.patch.yml`
  row both took effect (`pnpm list --dir ~/.dsh/profiles/web` to inspect);
- Panel errors → inspect the harness startup log or browser console; verify the
  `dsh-workspace-dir/list` route registered, e.g.
  `curl "http://127.0.0.1:3080/dsh-workspace-dir/list?path=<absolute path>"`.

## Troubleshooting quick reference

| Symptom | Cause | Handling |
| --- | --- | --- |
| Button missing | plugin not loaded | Check profile deps + patch row + restart |
| `list` route 404 | host half not loaded | Check the patch row `name: dsh-workspace-dir` spelling |
| `dsh plugin add` says package not found | used a package name instead of a local path | Use `file:<local clone path>` (this project is not on npm) |
| `pnpm install` peer version error | profile `autoInstallPeers` changed | Restore `autoInstallPeers: false` (generated by dsh) |
| Expand reports `directory browse failed` | stale code | Re-clone or rebuild (see below) |
| Garbled characters in paths | Chinese path | Migrate to an English path |

## Uninstall

1. Remove the `workspace-dir` row from `~/.dsh/profiles/web/cordis.patch.yml`;
2. `dsh plugin --profile web remove dsh-workspace-dir` (or remove the dependency
   from the profile's `package.json` manually and run `pnpm install`);
3. Restart the harness.

---

## Development / debugging lessons (important, do not repeat)

### 1. Browser reports `Cannot read properties of undefined (reading 'add')` at subscribe

- **Root cause**: if `panelStore` uses object method shorthand (`get() { return this.open }`), it
  relies on `this`. React's `useSyncExternalStore` calls `subscribe(fn)` **unbound** — `this` is
  `undefined`, so `this.listeners` is `undefined` and `.add()` throws. Both the header toggle and
  the floating panel share this store, so both slot entries crash and are retired.
- **Fix**: build the store through a closure factory whose methods capture the `store` variable
  instead of `this`:

  ```ts
  function createPanelStore(): PanelStore {
    const store = { /* ... */ get() { return store.open } /* ... */ }
    return store
  }
  const panelStore = createPanelStore()
  ```

- **How to spot it**: the slot entry is registered but `active: false` (abdicated); the browser
  console shows `slot entry crashed in '...'` plus a TypeError stack.

### 2. Chinese paths garble

A Chinese path such as `D:\Projects\插件` becomes `鎻掍欢` under pnpm, stalling or failing
`pnpm install`. **The project must live on an English path.** If the user's workspace is a
Chinese path, migrate to an English directory before continuing.

### 3. Build environment (sandbox / offline scenarios)

- Building only needs `tsdown` (the repo devDependencies are just tsdown, react,
  @types/react; `@deepseek-ai/*` is provided by the harness at runtime and never
  participates in the build).
- With no network, do not run `pnpm install`; if `node_modules` is absent, copy
  it from an existing install source, or point a junction at an existing
  `node_modules` (containing tsdown), then:

  ```sh
  node node_modules/tsdown/dist/run.mjs      # produces lib/index.js + lib/client.js
  ```

- **After changing source, rebuild and commit `lib/`** (build artifacts are
  committed so a clone works out of the box).

### 4. Updating the install source: use git pull, never copy files manually

- When the production install source and the dev repo are separate (e.g. install source
  `D:\Software\dsh_plugins\dsh-workspace-dir`, dev repo `D:\Projects\plugins\dsh-workspace-dir`),
  the install source **is itself a git clone**: **edit the dev repo, commit and push,
  then `git pull` in the install source** — build artifacts (`lib/`) are committed, so a
  pull is immediately usable, no build and no robocopy file copy needed.
- If the profile's `node_modules/dsh-workspace-dir` is a **junction**, refreshing the page after a
  pull is enough (`clientModules` serves bundles by content hash and updates the rev
  automatically); if it is a real copy, re-install instead.

### 5. Panel UI state persistence (open state + position + opacity)

- The panel's open/closed state, position and opacity should survive harness
  restarts; defaults: closed, 20% opacity (slider **0%–100%**, 0% = fully
  transparent background), position `{x:272,y:64}`.
- Implementation: three localStorage keys — `dsw-workspace-dir:panelOpen`
  (`'1'`/`'0'`), `dsw-workspace-dir:panelPos` (JSON `{x,y}`) and
  `dsw-workspace-dir:panelOpacity` (number); read at module load via
  `loadPanelOpen`/`loadPanelPos`/`loadPanelOpacity` with try/catch
  (sandboxed iframes may disable localStorage — fall back to defaults);
  the open state is written back in the store's `set()`, the position on
  drag end (`onPointerUp`), the opacity on slider `onChange`; component
  state initializes from the module variables. Never initialize from a
  component-local constant (it resets every time).

### 5a. Clickable-area interaction feedback convention (hover highlight + press scale)

- Hover: clickable areas (directory rows / ↗ / close) get a label-color
  background at `hoverAlpha = panelOpacity ± 0.2` (+0.2 when the panel is
  ≤50% so it stands out, −0.2 when >50%), restored on `onMouseLeave`; keep
  the inline-style convention, no CSS files.
- Press: `transform: scale(0.96)` on pointer down, restored on release
  (scale simulates the "font shrink/grow" without layout jumps), with
  `transition: background 120ms ease, transform 90ms ease`.
- Implementation: `hoverKey`/`activeKey` state plus `interactiveHandlers(key)`
  / `interactiveStyle(key)` helpers in the component, dispatched per element
  key.

### 6. Opening a folder in the OS file manager: use the official `host.openPath`

- Client-side `ctx.workspaces.openPath(<absolute path>)` → Host `host.openPath`:
  Windows uses `Invoke-Item` (Explorer), macOS `open`, desktop Linux `xdg-open`,
  and WSL translates via `wslpath -w` before handing the Windows path to
  `Invoke-Item`.
- Headless/container Linux is judged unreachable by `canOpenPath` and the call
  rejects — the panel shows the error inline; no button-hiding logic needed.
- **Do not** roll your own `explorer`/`open`/`xdg-open` through the shell
  service: platform differences, WSL path translation, and sandbox policy are
  all handled by the official opener.
- Client type: `IWorkspaces` is exported from `@deepseek-ai/dsh-client-runtime/client`;
  get it via `ctx.get('workspaces')` (optional service — null-check it).

## After you finish

- Report to the user: install succeeded, where the "目录" button appears, and
  how to uninstall;
- If you hit a problem this guide does not cover, bring the error back so the
  maintainer can update this guide.
