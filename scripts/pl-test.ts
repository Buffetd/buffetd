import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry } from '@/types'
import { autoCreateSource } from '@/lib/jobControl/source'
import { setEntry } from '@/lib/storage'

async function sendEmail() {
  const payload = await getPayload({ config })
  const email = await payload.sendEmail({
    to: 'test@example.com',
    subject: 'This is a test email',
    text: 'This is my message body',
  })
}

async function testEntry() {
  const entry: PureEntry = {
    source: 'test',
    key: '/test',
    meta: {
      sourceId: 1,
      ttlS: 3600,
      originStatus: 200,
      dataEncoding: 'json',
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    value: {
      id: 4559,
      uuid: '3f97cf57-6abd-46eb-a501-fc7f49aa2ab0',
      hitokoto: '我们是学生，学生就要有学生的样子。',
      type: 'b',
      from: 'JOJO的奇妙冒险',
      from_who: null,
      creator: '你家炸了',
      creator_uid: 3557,
      reviewer: 0,
      commit_from: 'web',
      created_at: '1564109075',
      length: 17,
    },
  }
  const result = await setEntry(entry, { persist: true, ttlSec: 60 })
  console.log(result)
}

async function main() {
  // await sendEmail()
  // const src = await autoCreateSource('https://api.github.com')
  // console.log(src)

  await testEntry()
}

await main()
