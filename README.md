# dsh-workspace-dir

DeepSeek Harness 插件:查看**当前对话的工作目录**及其文件列表。

会话标题旁新增 **"📁 目录"** 按钮,点击弹出**可拖动、背景透明度可调**的浮动目录面板,显示当前工作目录下的文件和子目录。

## 功能一览

- 会话头部"目录"按钮(Feather 风格文件夹图标 + 中文文本)
- 浮动目录面板:**可拖动**(拖标题栏)、**透明度可调**(滑杆 20%–100%)
- 显示当前会话工作目录 + 文件/子目录列表,**缩进分层**、支持下钻
- 切换会话自动跟随新会话的工作目录;无工作目录的会话不显示

## 安装(给没开发过的人的分步指南)

> 本插件依赖 DeepSeek Harness 的**源码运行环境**。推荐先按官方 README 从源码运行 harness:
>
> ```sh
> git clone https://github.com/deepseek-ai/deepseek-harness.git
> cd deepseek-harness
> pnpm install
> pnpm run build
> pnpm dsh web
> ```

### 第 1 步:克隆插件仓库

```sh
git clone https://github.com/DDSG-X/dsh-workspace-dir.git
cd dsh-workspace-dir
```

### 第 2 步:构建插件

```sh
pnpm install
pnpm build
```

构建产物生成在 `lib/`(`lib/index.js` 宿主半 + `lib/client.js` 浏览器半)。

### 第 3 步:安装到你的 harness

把插件加进 web profile(编辑 `~/.dsh/profiles/web/package.json` 的 `dependencies`):

```json
{
  "dependencies": {
    "dsh-workspace-dir": "file:D:/绝对路径/dsh-workspace-dir"
  }
}
```

在 `~/.dsh/profiles/web/cordis.patch.yml` 中注册插件行:

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

然后在 profile 目录执行:

```sh
cd ~/.dsh/profiles/web
pnpm install
```

> **注意**:源码运行环境下,插件的 peer 依赖(`@deepseek-ai/cordis` 等)必须能解析到 harness 源码仓库的版本。若 `pnpm install` 报版本找不到,把插件项目目录放进 harness 的 `packages/extensions/` 下作为 workspace 成员(peer 用 `workspace:^`),再在 harness 根目录 `pnpm install`。

### 第 4 步:重启 harness

重启 `dsh web`(或双击你的启动器)。重启后:

- 打开任意会话 → 标题旁出现 **"目录"** 按钮
- 点击弹出目录面板;拖动标题栏移动;滑杆调透明度;`✕` 关闭

## 故障排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 按钮/面板不出现 | 插件未加载 | 检查 profile 的 package.json 依赖和 cordis.patch.yml 是否都配好 |
| `pnpm install` 版本报错 | peer 依赖解析不到 | 按上面"注意"改为 harness workspace 成员 |
| 展开报 `directory browse failed` | 用了旧版插件 | 更新到最新代码重新构建 |
| 面板文字不可见 | 旧版用错主题变量 | 更新代码(`--dsw-alias-*` 已修复) |

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `workspace-dir` 行;
2. 从 `~/.dsh/profiles/web/package.json` 删除依赖;
3. 重启 harness。

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
    index.ts            # Client 半:注册"目录"按钮 + 浮动面板插槽
    DirectoryPanel.tsx   # DirectoryToggle(按钮)+ DirectoryPanel(可拖动/透明度/缩进树)
tsdown.config.ts         # 独立构建配置(不依赖 monorepo)
```

## 原理

- **Host 半**注册 `GET /dsh-workspace-dir/list?path=<abs>` JSON 路由,用 `fs` 服务(`resolve` + `listDir`)列出文件与子目录(含类型和大小);
- **Client 半**从会话快照读 cwd,fetch 该路由渲染目录树;
- 挂载点 `conversation.session.header.actions` + `shell.overlay`,均 `replaceRisk: none`,零侵入;
- 主题用真实 token(`--dsw-alias-*`),与 harness 界面一致。

## License

MIT
