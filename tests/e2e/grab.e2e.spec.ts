import { test, expect, Page } from '@playwright/test'

test.describe('API', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('Fetch Source', async ({ request }) => {
    const response = await request.get('/api/sources')
    expect(response.ok()).toBeTruthy()
  })
})
