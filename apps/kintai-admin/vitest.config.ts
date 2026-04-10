import { defineProject } from 'vitest/config'
import path from 'path'

export default defineProject({
  root: path.resolve(__dirname),
  test: {
    name: 'kintai-admin',
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/setup.ts'],
    globalSetup: ['__tests__/globalSetup.ts'],
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, '../../packages/shared/prisma/test.db')}`,
      JWT_SECRET: 'test-secret-key-for-testing-only',
    },
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: `${path.resolve(__dirname)}/$1` },
      { find: /^@kintai\/shared\/src\/(.*)/, replacement: `${path.resolve(__dirname, '../../packages/shared/src')}/$1` },
      { find: '@kintai/shared', replacement: path.resolve(__dirname, '../../packages/shared/src') },
    ],
  },
})
