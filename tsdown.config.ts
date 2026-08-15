/**
 * Standalone tsdown config for dsh-workspace-dir.
 *
 * Emits the browser client bundle the same way the harness's in-repo client
 * plugins do: a closure-factory artifact calling `window.__ModuleLoader__.load`
 * with the plugin id, resolving platform modules through the injected require.
 * This file is self-contained — it does NOT import the harness's shared
 * `tsdown.client.ts` preset, so the package builds outside the monorepo.
 */
import { defineConfig } from 'tsdown'

const ID = 'dsh-workspace-dir'

/**
 * The browser platform modules the harness shares into the frozen module
 * table. Everything here stays external; every other dependency is inlined.
 */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

/** The client-runtime package is a documented module-table exemption. */
const CLIENT_EXTERNALS = [...PLATFORM_MODULES, '@deepseek-ai/dsh-client-runtime/client']

export default defineConfig({
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  // Types ship from tsc; dts here would wrap the banner/footer into .d.cts.
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    // Anything in the frozen module table stays external; every other
    // dependency is inlined — a require() the table cannot answer is a
    // guaranteed runtime throw.
    neverBundle: CLIENT_EXTERNALS,
    alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
