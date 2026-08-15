# dsh-workspace-dir

一个 DeepSeek Harness 插件:在会话头部加一个 **"📁 目录"** 按钮,点一下就能弹出
当前对话工作目录的**文件/子目录列表**——不用切出 harness,边写代码边看项目结构。

点击后你会看到:一个**可拖动**的浮动面板,列出当前工作目录下的文件和子目录,
支持点击进入子目录,还能用滑杆调整面板透明度(20%–100%);每个文件夹旁有
**"↗"** 按钮,一键在**系统文件管理器**中打开它。面板的**位置与透明度会自动记忆**,
重启 harness 也不会丢。

<!-- TODO: 建议放一张效果截图(如 docs/screenshot.png),对陌生用户帮助最大 -->

## 功能一览

- 会话头部"目录"按钮(Feather 风格文件夹图标 + 中文文本)
- 浮动目录面板:**可拖动**(拖标题栏)、**透明度可调**(滑杆 20%–100%)、**位置/透明度自动记忆**(重启不丢)
- 显示当前会话工作目录 + 文件/子目录列表,**缩进分层**、支持下钻
- **在系统文件管理器中打开**当前文件夹或任意子文件夹(Windows 资源管理器 / macOS Finder / Linux 文件管理器,自动适配)
- 切换会话自动跟随新会话的工作目录;无工作目录的会话不显示

## 安装:让 AI 帮你(推荐——本项目的安装就是为这个设计的)

**本项目面向完全不熟悉它的 DeepSeek Harness 用户。** 你不需要懂插件、依赖、
profile——**装好它,只需要对你的 AI 说一句话**:

> 请把 https://github.com/DDSG-X/dsh-workspace-dir 克隆到英文路径,读取项目里的
> `AI-INSTALL.md`,按里面的步骤把 `dsh-workspace-dir` 插件安装到我的 harness,
> 并验证"目录"按钮能正常弹出面板。

AI 会自己完成:克隆仓库 → 读取安装引导(`AI-INSTALL.md`)→ 判断你的 harness
是源码运行还是 npm 安装 → 检测/初始化 web profile → 把插件装进 profile →
重启 harness → 验证"目录"按钮。**它只会在你批准时修改你的 profile 文件**;
遇到环境差异,也会按引导里的故障排查表处理,并把结果汇报给你。

> 引导文件 `AI-INSTALL.md` 为**中英双语单文件**(英文版在文件后半段,从
> `# English Guide` 开始);对英文 AI 说:
> "Clone https://github.com/DDSG-X/dsh-workspace-dir to an English path, read
> the English section of `AI-INSTALL.md`, install the plugin, then verify the Directory button works."

### 想自己动手?也可以只做 3 步

1. 克隆到**英文路径**(中文路径会导致 pnpm 乱码,安装会失败):

   ```sh
   git clone https://github.com/DDSG-X/dsh-workspace-dir.git
   ```

2. 在 DeepSeek Harness 里,把克隆下来的目录设为当前工作目录(workspace);
   不知道怎么设置就问你的 AI,它会带你操作;

3. 对你的 AI 说:

   > 请读取本项目的 `AI-INSTALL.md`,按里面的步骤把 `dsh-workspace-dir` 插件安装到我的 harness,并验证"目录"按钮能正常弹出面板。

> 本仓库**自带构建产物**(`lib/`),克隆后无需构建,可直接安装。只有修改源码的开发者才需要重新构建。
>
> ⚠️ **本项目未发布到 npm**:请**不要**用包名安装(如 `npm install dsh-workspace-dir`、
> `dsh plugin add dsh-workspace-dir` 都会因 npm 上找不到该包而失败)。安装**只能**
> 使用本地克隆路径(上面第 1 步的 `git clone` 目录,`dsh plugin add` 用 `file:` 指向它)。

### AI 安装效果示例

一个完全不了解插件的用户,实际体验大致是这样(实际输出会因环境和模型而异):

```text
你:请读取本项目的 AI-INSTALL.md,把 dsh-workspace-dir 插件安装到我的
    harness,并验证"目录"按钮能正常弹出面板。

AI:
  ✅ 第 1 步 检测环境
     → 发现 harness 源码 checkout
     → 发现 web profile(已初始化)

  ✅ 第 2 步 安装插件到 web profile
     → dsh plugin add 本地路径 完成(依赖已写入 profile package.json)
     → 在 cordis.patch.yml 注册 workspace-dir 行
     → pnpm install 完成

  ✅ 第 3 步 重启 harness 并验证
     → 重启完成,端口 3080 就绪
     → 会话标题旁出现"目录"按钮
     → 点击弹出目录面板,显示当前工作目录的文件列表
     → 拖动/透明度/关闭均正常

  安装成功!使用方式:打开任意会话 → 点标题旁"目录"按钮。
  卸载:告诉我,或按 AI-INSTALL.md 的卸载章节操作。
```

> AI 的语言、命令风格可能不同,但流程一致:检测 → 安装 → 重启验证 → 汇报。
> 若某一步失败,引导要求 AI 把错误信息带回来,你可以原样转发给维护者。

## 安装(手动,给想自己动手/了解细节的人)

> 一般用户不需要看这节——**AI 安装(上一节)会自动处理一切**。
> 另外请注意:本插件目前要求 **源码运行的 harness**(官方 README 推荐方式)。
> 如果你的 harness 是 npm 安装的(`npx @deepseek-ai/dsh web`),插件的 peer 依赖
> 由源码仓库提供、npm 上不完整,可能装不上——建议按官方 README 从源码运行。

> 本插件是 **out-of-tree 插件**:依赖 profile 的 hoisted linker,缺失的 peer
> 依赖(`@deepseek-ai/*`、`react` 等)在运行时由 harness 安装提供,不需要也不
> 应该从 npm 单独安装。profile 的 `pnpm-workspace.yaml` 由 `dsh` 自动生成,已
> 含 `nodeLinker: hoisted` 与 `autoInstallPeers: false`。

### 第 1 步:克隆插件仓库

```sh
git clone https://github.com/DDSG-X/dsh-workspace-dir.git
cd dsh-workspace-dir
```

仓库已包含构建产物 `lib/`(宿主半 `lib/index.js` + 浏览器半 `lib/client.js`),无需构建。

### 第 2 步:安装到你的 web profile

用 harness 的插件管理命令添加依赖(自动写入 profile 的 `package.json`):

```sh
# 用绝对路径指向克隆下来的插件目录;Windows 示例:
dsh plugin --profile web add file:D:/path/to/dsh-workspace-dir
```

> ⚠️ 本插件**未发布到 npm**——不要用包名安装(如 `dsh plugin add dsh-workspace-dir`
> 或 `npm install dsh-workspace-dir` 会失败),**必须**用 `file:` 指向本地克隆目录。

> 没有 `dsh` 命令?也可以手动编辑 `~/.dsh/profiles/web/package.json`,在
> `dependencies` 里加 `"dsh-workspace-dir": "file:D:/绝对路径/dsh-workspace-dir"`,
> 然后在 profile 目录执行 `pnpm install`。

在 `~/.dsh/profiles/web/cordis.patch.yml` 中注册插件行:

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

> `dsh plugin add` 只管理依赖,不会写 `cordis.patch.yml`,这行必须手动加。

### 第 3 步:重启 harness

重启 `dsh web`(或双击你的启动器)。重启后:

- 打开任意会话 → 标题旁出现 **"目录"** 按钮
- 点击弹出目录面板;拖动标题栏移动;滑杆调透明度;`✕` 关闭

### 更新插件

```sh
cd /path/to/dsh-workspace-dir
git pull          # 拉取最新代码(仓库自带构建产物,无需重新构建)
```

profile 的 `file:` 依赖直接读取克隆目录,拉到新文件后重启 harness 即可生效
(若安装时 profile 里是实体副本而非链接,重新执行第 2 步的安装命令)。

## 故障排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 按钮/面板不出现 | 插件未加载 | 检查 profile 的 package.json 依赖和 cordis.patch.yml 是否都配好 |
| 安装时报 peer 依赖版本找不到 | harness 是 npm 安装版 | 改用源码运行的 harness(见手动安装节说明) |
| 展开报 `directory browse failed` | 用了旧版插件 | 更新到最新代码(重新构建或重新克隆) |
| 面板文字不可见 | 旧版用错主题变量 | 更新代码(`--dsw-alias-*` 已修复) |

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `workspace-dir` 行;
2. 从 profile 移除依赖:`dsh plugin --profile web remove dsh-workspace-dir`
   (或手动从 `~/.dsh/profiles/web/package.json` 删除依赖后 `pnpm install`);
3. 重启 harness。

## 开发

```sh
pnpm install   # 只安装构建工具(tsdown、react 类型等),不会拉 @deepseek-ai peer
pnpm build     # 构建 lib/index.js(Host)+ lib/client.js(Client)
pnpm watch     # 监听源码变更并重新构建
```

> 类型检查(`tsc`)需要 `@deepseek-ai/*` 的类型包,它们只存在于 harness 源码
> 仓库(部分为 vendored),不发布到 npm;如需类型检查,把本仓库作为 harness
> workspace 成员(`packages/extensions/`)并在 harness 根目录 `pnpm install`
> 后再跑 `tsc --noEmit`。

### 项目结构

```
src/
  index.ts              # Host 半:webServer JSON 路由 + fs 列目录
  client/
    index.ts            # Client 半:注册"目录"按钮 + 浮动面板插槽
    DirectoryPanel.tsx   # DirectoryToggle(按钮)+ DirectoryPanel(可拖动/透明度/缩进树)
lib/                    # 构建产物(入库,克隆即用)
tsdown.config.ts         # 独立构建配置(不依赖 monorepo)
pnpm-workspace.yaml      # 独立仓库设置:autoInstallPeers: false
```

## 原理

- **Host 半**注册 `GET /dsh-workspace-dir/list?path=<abs>` JSON 路由,用 `fs` 服务(`resolve` + `listDir`)列出文件与子目录(含类型和大小);
- **Client 半**从会话快照读 cwd,fetch 该路由渲染目录树;
- 挂载点 `conversation.session.header.actions` + `shell.overlay`,均 `replaceRisk: none`,零侵入;
- 主题用真实 token(`--dsw-alias-*`),与 harness 界面一致。

## License

MIT
