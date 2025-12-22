import { test, expect } from '@playwright/test'

test.describe('API', () => {
  test('create entry with direct proxy', async ({ request }) => {
    const response = await request.get('/x/proxy?url=https://v1.hitokoto.cn/?c=b')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body).toMatchObject({
      message: {
        meta: expect.any(Object),
        value: expect.any(Object),
      },
    })
  })
})
