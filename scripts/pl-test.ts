import { getPayload } from 'payload'
import config from '@payload-config'

// const metadataSchema = z.object({
//   // Source Fields
//   source_id: z.string(),
//   key: z.string(),
//   key_hash: z.string(),
//   // HTTP Cache Fields
//   etag: z.string().nullable(),
//   last_modified: z.string().nullable(),
//   ttl_s: z.number(),
//   // HTTP Response Fields
//   origin_status: z.number(),
//   content_type: z.string().nullable(),
//   data_encoding: z.enum(['json', 'text']),
//   // Cache Fields
//   cached_at: z.date(),
//   expires_at: z.date(),
// })

async function testCache() {
  const payload = await getPayload({ config })

  const data = {
    cid: '',
    data: {
      id: 277,
      uuid: 'e31e3a1c-5afe-4424-ad38-6c7081e8ddce',
      hitokoto: '一起去看星星吧。',
      type: 'b',
      from: '未来日记',
      from_who: null,
      creator: 'lies',
      creator_uid: 0,
      reviewer: 0,
      commit_from: 'web',
      created_at: '1468949092',
      length: 8,
    },
    metadata: {
      source_id: 'hitokoto',
      key: '/?c=b',
      // key_hash: '',
      cached_at: '2025-11-10T13:00:01.430Z',
      expires_at: '2025-11-10T13:01:01.430Z',
      // stale: false,
      ttl_s: 60,
      last_modified: 'Mon, 10 Nov 2025 13:00:01 GMT',
      origin_status: 200,
      content_type: 'application/json; charset=utf-8',
      data_encoding: 'json' as const,
    },
  }
  const res = await payload.create({ collection: 'caches', data })
  console.log(res)
}

async function testPoolCache() {
  const payload = await getPayload({ config })

  const data = {
    sourceId: '1',
    cacheId: '/pool:/?c=b',
    poolKey: '/?c=b',
    poolHash: '577415b6ed54b752521c39676aa128b933c1ee46',
    metadata: {},
    data: {
      id: 5439,
      uuid: 'c27b5554-6d5d-4146-80c8-5d2fa8538e7b',
      hitokoto: '任尘世繁华，唯有守护你的一切，才是我此生唯一的使命。',
      type: 'b',
      from: '次元战争·红龙',
      from_who: '初启源',
      creator: 'Rain',
      creator_uid: 5767,
      reviewer: 4756,
      commit_from: 'web',
      created_at: '1586109411',
      length: 26,
    },
  }
  const res = await payload.create({ collection: 'cache_pools', data })
  console.log(res)
}

async function main() {
  // await testPoolCache()

  const payload = await getPayload({ config })
  const email = await payload.sendEmail({
    to: 'test@example.com',
    subject: 'This is a test email',
    text: 'This is my message body',
  })
}

await main()
