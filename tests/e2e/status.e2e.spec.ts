import { test, expect } from '@playwright/test'

test.describe('Status', () => {
  test('can go on status page', async ({ page }) => {
    await page.goto('/status')
    await expect(page).toHaveURL(/\/status$/)

    await expect(page.getByRole('heading', { level: 2, name: 'Status' })).toBeVisible()

    const list = page.getByRole('list')
    await expect(list).toBeVisible()

    const items = list.locator('li')
    await expect(items).toHaveCount(10)

    const metrics: Array<{ key: string; valueRegex: RegExp }> = [
      { key: 'Uptime', valueRegex: /^\d+(\.\d+)? seconds$/ },
      { key: 'Cached Hit', valueRegex: /^\d+$/ },
      { key: 'Cached Miss', valueRegex: /^\d+$/ },
      { key: 'Cached Stale Served', valueRegex: /^\d+$/ },
      { key: 'Sources', valueRegex: /^\d+$/ },
      { key: 'Entries', valueRegex: /^\d+$/ },
      { key: 'Jobs Total', valueRegex: /^\d+$/ },
      { key: 'Jobs Running', valueRegex: /^\d+$/ },
      { key: 'Jobs Pending', valueRegex: /^\d+$/ },
      { key: 'Jobs Failed', valueRegex: /^\d+$/ },
    ]

    for (const metric of metrics) {
      const row = items.filter({ hasText: metric.key })
      await expect(row).toHaveCount(1)

      const value = row.first().locator('span').last()
      await expect(value).toHaveText(metric.valueRegex)
    }
  })
})
