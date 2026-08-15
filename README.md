# dsh-workspace-dir

DeepSeek Harness 插件:查看**当前对话的工作目录**及其文件列表,在会话头部提供"目录"按钮,点击弹出**可拖动、透明度可调**的浮动目录面板。

## 功能

- 会话头部动作行新增 **"📁 目录"** 按钮(图标与创造模式按钮同风格的 Feather 描边文件夹)
- 点击弹出浮动目录面板,显示当前会话工作目录(cwd)及文件/子目录列表
- 面板**可拖动**(按住标题栏移动),默认位置避让新对话按钮
- 面板背景**透明度可调**(标题栏滑杆,20%–100% 连续调节)
- 目录行**缩进分层**,子项明显嵌套于当前目录行之下
- 支持点击子目录下钻、`↩ ..` 返回上级
- 切换会话时自动跟随新会话的工作目录
- 无工作目录的会话不显示面板

## 架构

**Host + Client 双半插件**,不依赖任何可选能力:

| 半 | 入口 | 作用 |
| --- | --- | --- |
| Host | `src/index.ts` | 注册 `GET /dsh-workspace-dir/list?path=<abs>` JSON 路由,通过 `fs` 服务(`resolve` + `listDir`)列出文件的类型和大小 |
| Client | `src/client/index.ts` | 会话头部注册"目录"按钮 + `shell.overlay` 注册浮动面板;从会话快照读 cwd,fetch 上述路由渲染目录树 |

> **为什么不用 `workspaces.listDirectory`?** 那是目录选择器的 `browse` 能力,只有组合了 browse 后端的部署才提供;常见部署组合的是 `native` 后端(打开系统对话框),该能力不可用。本插件自带 Host 列目录通道,与选择器无关,任何部署都能工作。

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

- 会话标题旁出现 **"目录"** 按钮(图标 + 中文文本)
- 点击弹出浮动面板:顶部显示当前工作目录,下方是缩进的子目录/文件列表
- 拖动标题栏可移动面板;拖动滑杆调节背景透明度;`✕` 关闭

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
    index.ts            # Client 半:注册"目录"按钮 + 浮动面板插槽,注入 fetch 路由
    DirectoryPanel.tsx   # 组件:DirectoryToggle(按钮)+ DirectoryPanel(可拖动/透明度/缩进树)
tsdown.config.ts         # 独立构建配置(不依赖 monorepo)
```

## 原理

- cwd 来自会话列表快照(纯 Client 读,零 RPC);
- 文件列表来自本插件自有的 Host JSON 路由(`fs.listDir` 返回 `FsDirEntry[]`,含 `type: 'file' | 'directory' | 'other'` 与 `size`);
- 挂载点:`conversation.session.header.actions`(会话头部动作行,additive)+ `shell.overlay`(全屏浮动层,additive),均为 `replaceRisk: none`,零侵入;
- 主题使用真实 token(`--dsw-alias-bg-overlay` 等,经 Theme.listTokens 验证),与 harness 界面一致;
- 构建产物遵循 harness 约定:Host 半为普通 ESM(`lib/index.js`),Client 半为 `window.__ModuleLoader__.load({ id, factory })` bundle(`lib/client.js`),平台模块(react 等)保持 external。

## License

MIT
