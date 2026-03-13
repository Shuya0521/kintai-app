import { defineProject } from 'vitest/config'
import path from 'path'

export default defineProject({
  test: {
    name: 'shared',
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@kintai/shared': path.resolve(__dirname, 'src'),
    },
  },
})
