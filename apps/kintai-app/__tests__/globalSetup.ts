import { execSync } from 'child_process'
import path from 'path'

export async function setup() {
  const schemaPath = path.resolve(__dirname, '../../../packages/shared/prisma/schema.prisma')
  const dbUrl = `file:${path.resolve(__dirname, '../../../packages/shared/prisma/test.db')}`

  execSync(`npx prisma db push --schema="${schemaPath}" --force-reset --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: path.resolve(__dirname, '../../../packages/shared'),
    stdio: 'pipe',
  })
}
