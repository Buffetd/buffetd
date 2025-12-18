import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/app/(frontend)',
        'src/app/(payload)',
        'src/app/(api)',
        'src/lib/pool',
        'src/{access,blocks,collections,components,endpoints,fields,Footer,Header,heros,hooks,plugins,providers,search,utilities}',
      ],
    },
    include: ['tests/int/**/*.int.spec.ts', 'src/**/*.test.ts'],
  },
})
