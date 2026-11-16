import { spawnSync } from 'node:child_process'

// Test builds must not embed a developer's live storage configuration.
const env = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_SUPABASE_ANON_KEY: '' }
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
for (const args of [
  ['run', 'build:vercel'],
  ['exec', '--', 'playwright', 'test', '--config', 'playwright.production.config.ts', ...process.argv.slice(2)],
]) {
  const result = spawnSync(npm, args, { env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
