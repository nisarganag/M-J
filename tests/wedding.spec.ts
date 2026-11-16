import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import source from '../src/data/default-ceremony.json' with { type: 'json' }

async function preview(page: Page) {
  await page.route('**/config.json', route => route.fulfill({ json: { supabaseUrl: '', supabasePublishableKey: '' } }))
  await page.goto('/')
}
async function login(page: Page, password = 'admin') {
  await page.getByRole('button', { name: 'Admin', exact: true }).click()
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
function sharedFixture() {
  const state = { document: structuredClone(source), revision: 1, updated_at: '2026-11-16T10:00:00Z', failPublish: false, conflict: false, delayMs: 0, reads: 0, writes: 0 }
  async function connect(context: BrowserContext) {
    await context.route('**/config.json', route => route.fulfill({ json: { supabaseUrl: 'https://wedding-test.supabase.co', supabasePublishableKey: 'sb_publishable_test' } }))
    await context.route('https://wedding-test.supabase.co/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
      const body = route.request().postDataJSON()
      if (path.endsWith('/wedding_login')) return route.fulfill({ json: body.p_username === 'admin' && body.p_password === 'admin' })
      if (path.endsWith('/publish_wedding')) {
        if (state.delayMs) await new Promise(resolve => setTimeout(resolve, state.delayMs))
        if (body.p_password !== 'admin') return route.fulfill({ status: 403, json: { message: 'INVALID_CREDENTIALS' } })
        if (state.failPublish) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
        if (state.conflict || body.p_expected_revision !== state.revision) return route.fulfill({ status: 409, json: { message: 'CONTENT_CONFLICT' } })
        state.document = body.p_document; state.revision++; state.writes++
        state.updated_at = new Date().toISOString()
        return route.fulfill({ json: [{ document: state.document, revision: state.revision, updated_at: state.updated_at }] })
      }
      if (path.endsWith('/wedding_ceremony')) {
        state.reads++
        return route.fulfill({ json: [{ document: state.document, revision: state.revision, updated_at: state.updated_at }] })
      }
      return route.fulfill({ status: 501, json: { message: 'Endpoint not modeled by this fixture' } })
    })
  }
  return { state, connect }
}

test('guests can read, filter and search the supplied ceremony', async ({ page }) => {
  await preview(page)
  await expect(page.getByRole('heading', { name: /Mohini.*Jewel/ })).toBeVisible()
  await page.getByRole('link', { name: 'Follow the ceremony' }).click()
  await expect(page.getByRole('button', { name: /Entrance Procession/ })).toBeVisible()
  await page.getByRole('button', { name: 'Hymns', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search the ceremony' }).fill('Here I Am')
  await expect(page.getByRole('button', { name: /Offertory/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /First Reading/ })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search the ceremony' }).fill('not-a-real-hymn')
  await expect(page.getByText('No matching moments')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('button', { name: /First Reading/ })).toBeVisible()
})

test('admin login rejects wrong passwords and preview edits survive reload', async ({ page }) => {
  await preview(page)
  await login(page, 'wrong')
  await expect(page.getByText('The username or password is incorrect.')).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill('admin')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Preview mode', { exact: true })).toBeVisible()
  await page.getByLabel('Section title', { exact: true }).fill('A joyful entrance')
  await page.getByLabel('Prayer, reading, or hymn text').fill('Everyone: Welcome with love.\n\n<img src=x onerror=alert(1)>')
  await page.getByRole('button', { name: 'Preview section' }).click()
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save preview', exact: true }).click()
  await expect(page.getByText('Preview saved on this device.')).toBeVisible()
  await page.getByRole('button', { name: 'Close editor' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /A joyful entrance/ })).toBeVisible()
})

test('a shared publication reaches a guest in a different browser context automatically', async ({ browser }) => {
  const fixture = sharedFixture()
  const guestContext = await browser.newContext(), editorContext = await browser.newContext()
  await fixture.connect(guestContext); await fixture.connect(editorContext)
  const guest = await guestContext.newPage(), editor = await editorContext.newPage()
  await guest.goto('/'); await editor.goto('/')
  await login(editor)
  await editor.getByLabel('Section title', { exact: true }).fill('An entrance shared with everyone')
  await editor.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect(editor.getByText('Published. Your guests will see this version.')).toBeVisible()
  await expect(guest.getByRole('button', { name: /An entrance shared with everyone/ })).toBeVisible({ timeout: 15000 })
  expect(fixture.state.writes).toBe(1)
  expect(fixture.state.reads).toBeGreaterThan(2)
  await guestContext.close(); await editorContext.close()
})

test('failed publication and version conflict preserve the editor draft', async ({ context, page }) => {
  const fixture = sharedFixture(); await fixture.connect(context)
  await page.goto('/'); await login(page)
  await page.getByLabel('Section title', { exact: true }).fill('My unsaved work')
  fixture.state.failPublish = true
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Shared storage is unavailable')
  await expect(page.getByLabel('Section title', { exact: true })).toHaveValue('My unsaved work')
  fixture.state.failPublish = false; fixture.state.conflict = true
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('A newer version was published')
  await expect(page.getByLabel('Section title', { exact: true })).toHaveValue('My unsaved work')
  expect(fixture.state.writes).toBe(0)
})

test('publication locks text fields until the response arrives', async ({ context, page }) => {
  const fixture = sharedFixture(); fixture.state.delayMs = 1800; await fixture.connect(context)
  await page.goto('/'); await login(page)
  await page.getByLabel('Section title', { exact: true }).fill('A carefully saved entrance')
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect(page.getByLabel('Section title', { exact: true })).toBeDisabled({ timeout: 400 })
  await expect(page.getByText('Published. Your guests will see this version.')).toBeVisible()
  await expect(page.getByLabel('Section title', { exact: true })).toBeEnabled()
})

test('background updates preserve a dirty draft and prevent overwriting newer content', async ({ context, page }) => {
  const fixture = sharedFixture(); await fixture.connect(context)
  await page.goto('/'); await login(page)
  await page.getByLabel('Section title', { exact: true }).fill('My private draft')
  fixture.state.document.sections[0].title = 'Another editor published this'
  fixture.state.revision++
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(/A newer ceremony has been published/)).toBeVisible()
  await expect(page.getByLabel('Section title', { exact: true })).toHaveValue('My private draft')
  await expect(page.getByRole('button', { name: 'Publish changes', exact: true })).toBeDisabled()
})

test('unfinished text is recovered after a reload without becoming guest content', async ({ page }) => {
  await preview(page); await login(page)
  await page.getByLabel('Prayer, reading, or hymn text').fill('')
  await expect(page.getByText('Draft saved on this device.')).toBeVisible()
  page.on('dialog', dialog => void dialog.accept())
  await page.reload()
  await expect(page.getByText('Song: Canon in D – Instrumental')).toBeVisible()
  await login(page)
  await expect(page.getByLabel('Prayer, reading, or hymn text')).toHaveValue('')
})

test('undoing all changes does not resurrect an old autosaved draft', async ({ page }) => {
  await preview(page); await login(page)
  await page.getByLabel('Section title', { exact: true }).fill('Discard this edit')
  await expect(page.getByText('Draft saved on this device.')).toBeVisible()
  await page.getByLabel('Section title', { exact: true }).fill('Entrance Procession')
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close editor' }).click()
  await page.getByRole('button', { name: 'Edit ceremony', exact: true }).click()
  await expect(page.getByLabel('Section title', { exact: true })).toHaveValue('Entrance Procession')
})

test('mobile reader and editor stay within the viewport and remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await preview(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, message: n.failureSummary })) }))).toEqual([])
  await login(page)
  await expect(page.getByLabel('Section title', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Close editor' }).click()
  await page.getByRole('button', { name: 'Increase reading size' }).click()
  await page.getByRole('button', { name: 'Increase reading size' }).click()
  await page.getByRole('button', { name: /Holy Communion/ }).first().click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
