# AI 安装引导(AI-INSTALL.md)

> 本文档写给 **AI agent**(DeepSeek Harness 或其他编码代理),不是给人手动执行的。
> 用户把本仓库作为 workspace 打开后,你可以直接读取本文件,按以下步骤自动完成安装。
>
> 你的权限:本仓库目录(可写)、harness 源码目录(通常可读)、`~/.dsh/profiles/web`(需要用户批准写入)。
> 每一步都有"验证"和"失败处理",请逐条执行,不要跳过验证。

---

## 目标

把 `dsh-workspace-dir` 插件安装到用户的 DeepSeek Harness Web UI,使其在会话头部出现"目录"按钮,点击弹出可拖动、透明度可调的目录面板。

## 第 0 步:确认工作目录

先确认你在哪个目录:

```sh
pwd
ls
```

本仓库应包含:`src/`、`lib/`(构建产物,可能已存在)、`package.json`、`tsdown.config.ts`、`AI-INSTALL.md`。

## 第 1 步:检测 harness 运行环境(关键分叉)

用户可能有两种 harness 安装方式,安装路径不同。检测:

```sh
# 源码运行(官方 README 推荐)?
ls D:/Software/deepseek-harness/package.json 2>/dev/null && echo "SOURCE_CHECKOUT_FOUND"
# 或常见源码位置
ls ~/deepseek-harness/package.json 2>/dev/null && echo "SOURCE_CHECKOUT_FOUND_HOME"

# npm 全局安装?
which dsh 2>/dev/null || npm ls -g @deepseek-ai/dsh 2>/dev/null

# web profile 存在?
ls ~/.dsh/profiles/web/package.json 2>/dev/null && echo "PROFILE_EXISTS"
```

- 若检测到源码 checkout(`SOURCE_CHECKOUT_FOUND`)→ 走 **方式 A(源码 harness)**;
- 若只有 npm 安装或都不确定 → 走 **方式 B(通用)**;
- 若 `PROFILE_EXISTS` 不存在,提示用户先跑一次 `dsh web` 生成 profile。

## 第 2 步:构建插件

```sh
cd <本仓库目录>
pnpm install
pnpm build
```

**验证**:`ls lib/` 应包含 `index.js` 和 `client.js`。
**失败处理**:
- `pnpm install` 报 `@deepseek-ai/*` 版本找不到 → 这是 peer 依赖解析问题,跳到 **方式 A 第 3 步的"workspace 成员"变体**;
- 网络错误 → 提示用户检查网络/镜像,重试一次。

## 方式 A:源码 harness(推荐路径)

### A1. 确认 harness 源码位置

从第 1 步结果取源码目录变量 `HARNESS_SRC`(如 `D:/Software/deepseek-harness`)。

### A2. 尝试直接装入 profile(最简单)

1. 编辑 `~/.dsh/profiles/web/package.json`,在 `dependencies` 加:

```json
"dsh-workspace-dir": "file:<本仓库绝对路径>"
```

2. 编辑 `~/.dsh/profiles/web/cordis.patch.yml`,追加:

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

3. 在 profile 目录安装:

```sh
cd ~/.dsh/profiles/web
pnpm install
```

**验证**:`pnpm install` 成功且 `~/.dsh/profiles/web/node_modules/dsh-workspace-dir` 存在。
**失败处理**:若 `pnpm install` 报 peer 依赖(`@deepseek-ai/cordis` 等)版本无法解析(常见,因为 npm 上的 rc 版本不完整)→ **不要放弃,执行 A3**。

### A3. workspace 成员变体(peer 依赖从源码解析,最可靠)

1. 把本仓库**链接为 harness 的 workspace 成员**:

```sh
# 在 harness 的 packages/extensions/ 下建符号链接(Windows 用 junction)
cd <HARNESS_SRC>/packages/extensions
mklink /J dsh-workspace-dir <本仓库绝对路径>
# 非 Windows: ln -s <本仓库绝对路径> dsh-workspace-dir
```

2. 把本仓库 `package.json` 的 peerDependencies/devDependencies 中的 `@deepseek-ai/*` 版本改为 `workspace:^`:

```json
"@deepseek-ai/cordis": "workspace:^"
```

3. 在 harness 根目录安装(让 workspace 解析生效):

```sh
cd <HARNESS_SRC>
pnpm install
```

4. 在 web profile 注册插件行(同 A2 第 2 步):

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

> 注意:profile 的 `package.json` 依赖若仍解析不到,可改为指向 `file:<HARNESS_SRC>/packages/extensions/dsh-workspace-dir`。

## 方式 B:通用 / npm 安装的 harness

若用户是 npm 安装的 harness(`npx @deepseek-ai/dsh web`),peer 依赖需从 npm 解析。当前 DeepSeek 官方的 npm 依赖链尚不完整(`dsh-compact` 等 404),此时:

1. 仍可先尝试 **A2**(也许用户的 npm 环境能解析);
2. 若失败,如实告知用户:**官方 npm 依赖链未发布完整,此插件暂不支持 npm 安装**,建议改用源码运行 harness(官方 README 推荐方式),再走方式 A。

## 第 3 步:验证安装(必须)

1. **重启 harness**:
   - 若用户有启动器(如 `D:/Software/harness-launcher/`),重启它;
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
| `pnpm install` 版本报错 | peer 依赖解析不到 | 走方式 A3(workspace 成员) |
| 按钮不出现 | 插件未加载 | 检查 profile 依赖 + patch 行 + 重启 |
| `list` 路由 404 | Host 半未加载 | 检查 patch 行 `name: dsh-workspace-dir` 拼写 |
| 展开报 `directory browse failed` | 用了旧版代码 | 重新 `pnpm build` |

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

- 沙箱无网络时 **不要用 `pnpm build`**(会尝试解析依赖);直接调本地工具:
  ```sh
  cd <本仓库目录>
  node node_modules/tsdown/dist/run.mjs      # 生成 lib/index.js + lib/client.js
  ```
- 若 `node_modules` 不在仓库内(新克隆),可从已有安装源目录复制,或先确认依赖就绪。

### 4. 安装源同步

- 正式安装源与开发仓库分离时(如安装源 `D:\Software\dsh_plugins\dsh-workspace-dir`、
  开发源 `D:\Projects\plugins\dsh-workspace-dir`),**先改开发源并提交 git,再同步到安装源**。
- profile 的 `node_modules/dsh-workspace-dir` 若是 **junction**,构建后刷新页面即生效
  (`clientModules` 按内容 hash 提供 bundle,自动更新 rev);若是实体副本则需手动复制 lib。

### 5. 面板透明度持久化约定

- 面板默认最透明(20%,滑杆最小值),且关闭再打开应记住上次调整值。
- 实现:`panelOpacity` 为模块级变量(初始 `0.2`),state 初始化为 `panelOpacity`,
  滑杆 `onChange` 同步写回 `panelOpacity`。不要用组件内 `useState(0.9)`(会每次重置)。

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `workspace-dir` 行;
2. 从 `~/.dsh/profiles/web/package.json` 删除 `dsh-workspace-dir` 依赖;
3. 若走了 A3,移除 `packages/extensions/dsh-workspace-dir` 链接;
4. 重启 harness。

## 完成后

- 向用户报告:安装成功、在哪里看到了"目录"按钮、如何卸载;
- 若遇到本文件未覆盖的问题,把错误信息带回,供维护者更新本引导。
