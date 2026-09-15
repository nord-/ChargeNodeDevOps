import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    writeBundle({ dir }) {
      const swPath = resolve(dir!, 'sw.js')
      const content = readFileSync(swPath, 'utf-8')
      writeFileSync(swPath, content.replace('__SW_VERSION__', pkg.version))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/ChargeNodeDevOps/',
  // The repo is reachable both directly and through a symlinked path
  // (prj/private-projects is a symlink to private-projects). Without this, Vite
  // resolves index.html to its real path, which then lies outside the configured
  // root, and the HTML plugin fails on an absolute file name.
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [react(), swVersionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
