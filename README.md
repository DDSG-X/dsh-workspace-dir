# dsh-workspace-dir

DeepSeek Harness Web UI 插件:在输入框下方显示**当前对话的工作目录**及其目录树,让你一眼看到 agent 正在哪个目录里工作。

![slot](https://img.shields.io/badge/slot-conversation.composer.dock-8A2BE2)

## 功能

- 在 `conversation.composer.dock`(输入框下方状态条,统计行旁边)显示当前会话的工作目录(cwd)
- 点击一行可展开,显示该目录下的**子目录列表**
- 点击子目录可逐级下钻,支持返回上级
- 切换会话时自动跟随新会话的工作目录
- 无工作目录的会话(如未归组的会话)自动隐藏,不打扰界面

> **说明**:本插件使用 harness 自带的 `workspaces.listDirectory`(目录选择器能力),它只列出**子目录**、不含文件。若需要完整文件列表,需扩展为 Host + Client 双半插件(用 `fs.listDir`),见文末"扩展"。

## 安装

### 方式一:本地源码运行(推荐开发调试)

1. 克隆本仓库,进入目录:

   ```sh
   git clone <your-repo-url> dsh-workspace-dir
   cd dsh-workspace-dir
   ```

2. 安装依赖并构建(peer 依赖来自 DeepSeek Harness 的 npm 包):

   ```sh
   pnpm install
   pnpm build
   ```

3. 把插件加进你的 harness 的 web profile:

   ```sh
   dsh plugin --profile web add <本目录绝对路径>
   ```

   或手动编辑 `~/.dsh/profiles/web/package.json`,在 `dependencies` 里加上本包,并在 `dsh.profile.bundles` 中登记后重启 `dsh web`。

### 方式二:发布到 npm 后安装

```sh
npm publish
dsh plugin --profile web add dsh-workspace-dir
```

## 使用

启动 harness 后,打开任意会话:

- 输入框下方会出现一行 `📁 <目录名> <完整路径>`
- 点击展开/收起目录树
- 点击子目录下钻,`↩ ..` 返回上级

## 开发

```sh
pnpm build      # 构建 lib/client.js(浏览器 bundle)
pnpm typecheck  # 仅类型检查
pnpm watch      # 监听源码变更并重新构建
```

### 项目结构

```
src/client/
  index.ts            # 插件入口:注册 conversation.composer.dock 条目
  WorkspaceDirDock.tsx # 组件:显示 cwd + 目录树
tsdown.config.ts       # 独立构建配置(不依赖 monorepo,产出 __ModuleLoader__ bundle)
```

## 原理

- **纯 Client 插件**,不需要 Host 半:
  - 工作目录来自会话列表快照 `useSessions(list => list.byId[sessionId]?.cwd)`
  - 目录树来自 `ctx.workspaces.listDirectory(path)`(与内置工作区选择器同一能力)
- 挂载点 `conversation.composer.dock` 是会话级 list 插槽,`replaceRisk: none`,与内置 stats 行并存,零侵入。
- 构建产物遵循 harness 的 client bundle 约定(`window.__ModuleLoader__.load({ id, factory })`),平台模块(react 等)保持 external。

## 扩展:显示文件

当前版本只显示子目录。要显示完整文件列表,需要:

1. 增加 Host 半(本仓库 `src/host/`),注册一个 Remote 或 HTTP 路由,调用 `ctx.fs.listDir(target)`(`FsDirEntry` 含 `type: 'file' | 'directory'` 与 `size`);
2. Client 半改为通过 `ctx.remote`(静态插件)调用该服务,替换 `listDirectory`。

欢迎提交 PR。

## License

MIT
