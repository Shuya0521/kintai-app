import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/shared',
      'apps/kintai-app',
      'apps/kintai-admin',
    ],
  },
})
