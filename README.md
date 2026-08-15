# dsh-workspace-dir

DeepSeek Harness 插件:在输入框下方显示**当前对话的工作目录**及其**文件列表**,让你一眼看到 agent 正在哪个目录里工作、里面有什么。

## 功能

- 在 `conversation.composer.dock`(输入框下方状态条,统计行旁边)显示当前会话的工作目录(cwd)
- 点击一行展开,显示该目录下的**子目录和文件**(文件带大小)
- 点击子目录可逐级下钻,支持返回上级
- 切换会话时自动跟随新会话的工作目录
- 无工作目录的会话(如未归组的会话)自动隐藏

## 架构

**Host + Client 双半插件**,不依赖任何可选能力:

| 半 | 入口 | 作用 |
| --- | --- | --- |
| Host | `src/index.ts` | 注册 `GET /dsh-workspace-dir/list?path=<abs>` JSON 路由,通过 `fs` 服务(`resolve` + `listDir`)列出文件的类型和大小 |
| Client | `src/client/index.ts` | 从会话快照读 cwd(`useSessions(list => list.byId[sessionId]?.cwd)`),fetch 上述路由,渲染目录树 |

> **为什么不用 `workspaces.listDirectory`?** 那是目录选择器的 `browse` 能力,只有组合了 browse 后端的部署才提供;你的部署组合的是 `native` 后端(打开系统对话框),该能力不可用。本插件自带 Host 列目录通道,与选择器无关,任何部署都能工作。

## 安装

### 方式一:本地源码运行(推荐开发调试)

```sh
git clone <your-repo-url> dsh-workspace-dir
cd dsh-workspace-dir
pnpm install
pnpm build
```

把插件加进 web profile(编辑 `~/.dsh/profiles/web/package.json` 的 `dependencies`,并确保 profile 组合了本包),重启 `dsh web`。

### 方式二:发布到 npm 后安装

```sh
npm publish
dsh plugin --profile web add dsh-workspace-dir
```

## 使用

启动 harness 后打开任意会话:

- 输入框下方出现一行 `📁 <目录名> <完整路径>`
- 点击展开,看到 `📁` 子目录(可点击下钻)和 `📄` 文件(带大小)
- `↩ ..` 返回上级

## 开发

```sh
pnpm build      # 构建 lib/index.js(Host)+ lib/client.js(Client)
pnpm typecheck  # 仅类型检查
pnpm watch      # 监听源码变更并重新构建
```

### 项目结构

```
src/
  index.ts              # Host 半:webServer JSON 路由 + fs 列目录
  client/
    index.ts            # Client 半:注册 conversation.composer.dock 条目 + fetch 路由
    WorkspaceDirDock.tsx # 组件:显示 cwd + 文件列表
tsdown.config.ts         # 独立构建配置(不依赖 monorepo)
```

## 原理

- cwd 来自会话列表快照(纯 Client 读,零 RPC);
- 文件列表来自本插件自有的 Host JSON 路由(`fs.listDir` 返回 `FsDirEntry[]`,含 `type: 'file' | 'directory' | 'other'` 与 `size`);
- 挂载点 `conversation.composer.dock` 是会话级 list 插槽,`replaceRisk: none`,与内置 stats 行并存,零侵入;
- 构建产物遵循 harness 约定:Host 半为普通 ESM(`lib/index.js`),Client 半为 `window.__ModuleLoader__.load({ id, factory })` bundle(`lib/client.js`),平台模块(react 等)保持 external。

## License

MIT
