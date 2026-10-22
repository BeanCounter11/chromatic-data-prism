import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages project sites live at /<repo>/ (and forks rename the repo).
 * GITHUB_REPOSITORY is set in Actions; locally and on preview we stay at /.
 * Override with VITE_BASE_PATH if you deploy elsewhere.
 */
function resolveBase() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH
  if (process.env.GITHUB_REPOSITORY) {
    const name = process.env.GITHUB_REPOSITORY.split('/')[1]
    return name ? `/${name}/` : '/'
  }
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
