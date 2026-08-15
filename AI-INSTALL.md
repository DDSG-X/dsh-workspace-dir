# AI 安装引导(AI-INSTALL.md)

> 本文档写给 **AI agent**(DeepSeek Harness 或其他编码代理),不是给人手动执行的。
> 用户把本仓库作为 workspace 打开后,你可以直接读取本文件,按以下步骤自动完成安装。
>
> **你的用户很可能完全不了解这个插件,也不懂安装**。因此:
> - 不要假设用户懂技术——先简短告诉用户你要做什么(检测环境 → 装进 profile → 重启 → 验证);
> - 修改 `~/.dsh/profiles/web` 前,先说明并取得用户批准(你的写入权限需要用户确认);
> - 用户答不上来的问题(如"harness 源码在哪")不要反复追问,给出现成的最简路径(见第 1 步)。
>
> 你的权限:本仓库目录(可写)、harness 源码目录(通常可读)、`~/.dsh/profiles/web`(需要用户批准写入)。
> 每一步都有"验证"和"失败处理",请逐条执行,不要跳过验证。
>
> 本仓库**自带构建产物**(`lib/`),安装流程不要求构建。构建只对改源码的开发者有意义(见文末"开发/排错经验")。

---

## 目标

把 `dsh-workspace-dir` 插件安装到用户的 DeepSeek Harness Web UI,使其在会话头部出现"目录"按钮,点击弹出可拖动、透明度可调的目录面板。

## 第 0 步:确认工作目录

先确认你在哪个目录:

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

### 4. 安装源同步

- 正式安装源与开发仓库分离时(如安装源 `D:\Software\dsh_plugins\dsh-workspace-dir`、
  开发源 `D:\Projects\plugins\dsh-workspace-dir`),**先改开发源并提交 git,再同步到安装源**。
- profile 的 `node_modules/dsh-workspace-dir` 若是 **junction**,构建后刷新页面即生效
  (`clientModules` 按内容 hash 提供 bundle,自动更新 rev);若是实体副本则需手动复制 lib。

### 5. 面板透明度持久化约定

- 面板默认最透明(20%,滑杆最小值),且关闭再打开应记住上次调整值。
- 实现:`panelOpacity` 为模块级变量(初始 `0.2`),state 初始化为 `panelOpacity`,
  滑杆 `onChange` 同步写回 `panelOpacity`。不要用组件内 `useState(0.9)`(会每次重置)。

## 完成后

- 向用户报告:安装成功、在哪里看到了"目录"按钮、如何卸载;
- 若遇到本文件未覆盖的问题,把错误信息带回,供维护者更新本引导。
