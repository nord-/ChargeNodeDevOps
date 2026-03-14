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
  plugins: [react(), swVersionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
