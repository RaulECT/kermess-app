import { build } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// En Cloud Build, ../shared/src no existe. Si el lib/ ya fue pre-compilado
// localmente (via predeploy), lo saltamos.
const sharedSrc = resolve(__dirname, '../shared/src/index.ts')
const libOut = resolve(__dirname, 'lib/index.js')
if (!existsSync(sharedSrc) && existsSync(libOut)) {
  console.log('lib/index.js already built — skipping bundle step.')
  process.exit(0)
}

await build({
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: resolve(__dirname, 'lib/index.js'),
  // Keep firebase-admin and firebase-functions as external (available in Cloud Functions runtime)
  external: ['firebase-admin', 'firebase-functions', 'firebase-admin/*', 'firebase-functions/*'],
  // Include workspace packages by resolving them from the monorepo
  alias: {
    '@kermess/shared': resolve(__dirname, '../shared/src/index.ts'),
  },
  sourcemap: false,
  minify: false,
  logLevel: 'info',
})
