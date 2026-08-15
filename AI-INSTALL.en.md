# AI Installation Guide (AI-INSTALL.md)

> This document is written for an **AI agent** (DeepSeek Harness or another
> coding agent), not for a human to follow manually. Once the user opens this
> repository as a workspace, read this file and follow the steps below to
> install the plugin automatically.
>
> Your access: this repository directory (writable), the harness source
> checkout (usually readable), and `~/.dsh/profiles/web` (writes require user
> approval). Every step has a **verify** and a **failure handling** clause —
> execute them in order, never skip verification.

---

## Goal

Install the `dsh-workspace-dir` plugin into the user's DeepSeek Harness Web
UI so a **"目录" (Directory)** button appears in the session header, opening a
draggable directory panel with adjustable background opacity.

## Step 0: Confirm the working directory

Check where you are:

```sh
pwd
ls
```

This repository should contain: `src/`, `lib/` (build artifacts, may already
exist), `package.json`, `tsdown.config.ts`, and this file.

## Step 1: Detect the harness environment (critical fork)

Users may run the harness in one of two ways, and the install path differs.
Detect:

```sh
# Source checkout (official README recommendation)?
ls D:/Software/deepseek-harness/package.json 2>/dev/null && echo "SOURCE_CHECKOUT_FOUND"
# Or a common source location
ls ~/deepseek-harness/package.json 2>/dev/null && echo "SOURCE_CHECKOUT_FOUND_HOME"

# Global npm install?
which dsh 2>/dev/null || npm ls -g @deepseek-ai/dsh 2>/dev/null

# Does the web profile exist?
ls ~/.dsh/profiles/web/package.json 2>/dev/null && echo "PROFILE_EXISTS"
```

- If a source checkout is found (`SOURCE_CHECKOUT_FOUND`) → use **Method A (source harness)**;
- If only an npm install is found, or nothing is certain → use **Method B (generic)**;
- If `PROFILE_EXISTS` is missing, ask the user to run `dsh web` once to create the profile.

## Step 2: Build the plugin

```sh
cd <this repo>
pnpm install
pnpm build
```

**Verify**: `ls lib/` should contain `index.js` and `client.js`.
**Failure handling**:
- `pnpm install` reports a missing version for `@deepseek-ai/*` → this is a
  peer-dependency resolution problem; jump to **Method A, Step 3 "workspace
  member" variant**;
- Network error → ask the user to check connectivity/mirror and retry once.

## Method A: source harness (recommended)

### A1. Locate the harness source

Use the source directory from Step 1 as `HARNESS_SRC` (e.g. `D:/Software/deepseek-harness`).

### A2. Try installing directly into the profile (simplest)

1. Edit `~/.dsh/profiles/web/package.json` and add to `dependencies`:

```json
"dsh-workspace-dir": "file:<absolute path to this repo>"
```

2. Edit `~/.dsh/profiles/web/cordis.patch.yml` and append:

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

3. Install in the profile directory:

```sh
cd ~/.dsh/profiles/web
pnpm install
```

**Verify**: `pnpm install` succeeds and `~/.dsh/profiles/web/node_modules/dsh-workspace-dir` exists.
**Failure handling**: if `pnpm install` reports unresolvable peer dependencies
(`@deepseek-ai/cordis`, etc.) — common, because the npm rc versions are
incomplete — **do not give up; run A3**.

### A3. Workspace-member variant (peer deps resolve from source, most reliable)

1. Link this repo as a workspace member of the harness:

```sh
# Windows uses a junction; run from the harness extensions directory
cd <HARNESS_SRC>/packages/extensions
mklink /J dsh-workspace-dir <absolute path to this repo>
# Non-Windows: ln -s <absolute path to this repo> dsh-workspace-dir
```

2. In this repo's `package.json`, change the `@deepseek-ai/*` versions in
   `peerDependencies` and `devDependencies` to `workspace:^`:

```json
"@deepseek-ai/cordis": "workspace:^"
```

3. Install from the harness root (so workspace resolution takes effect):

```sh
cd <HARNESS_SRC>
pnpm install
```

4. Register the plugin row in the web profile (same as A2 step 2):

```yaml
- insert:
    - id: workspace-dir
      name: dsh-workspace-dir
```

> Note: if the profile's `package.json` dependency still fails to resolve,
> point it at `file:<HARNESS_SRC>/packages/extensions/dsh-workspace-dir`.

## Method B: generic / npm-installed harness

If the user runs an npm-installed harness (`npx @deepseek-ai/dsh web`), peer
dependencies must resolve from npm. DeepSeek's official npm dependency chain
is currently incomplete (`@deepseek-ai/dsh-compact` returns 404, etc.). In
that case:

1. Still try **A2** first — the user's npm environment may resolve it;
2. If it fails, honestly tell the user: *the official npm dependency chain is
   not fully published yet, so this plugin does not support npm install for
   now; switch to a source checkout of the harness (the official README
   recommendation) and use Method A.*

## Step 3: Verify the install (mandatory)

1. **Restart the harness**:
   - If the user has a launcher (e.g. `D:/Software/harness-launcher/`), restart it;
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
| `pnpm install` version error | peer deps unresolvable | Use Method A3 (workspace member) |
| Button missing | plugin not loaded | Check profile deps + patch row + restart |
| `list` route 404 | host half not loaded | Check the patch row `name: dsh-workspace-dir` spelling |
| Expand reports `directory browse failed` | stale code | Re-run `pnpm build` |

## Uninstall

1. Remove the `workspace-dir` row from `~/.dsh/profiles/web/cordis.patch.yml`;
2. Remove the `dsh-workspace-dir` dependency from `~/.dsh/profiles/web/package.json`;
3. If Method A3 was used, remove the `packages/extensions/dsh-workspace-dir` link;
4. Restart the harness.

## After you finish

- Report to the user: install succeeded, where the "目录" button appears, and
  how to uninstall;
- If you hit a problem this guide does not cover, bring the error back so the
  maintainer can update this guide.
