import { type Payload, getPayload } from 'payload'
import config from '@payload-config'
import { type PureSource } from '@/types'

async function createSources(payload: Payload) {
  const sources: PureSource[] = [
    {
      baseUrl: 'https://v1.hitokoto.cn',
      name: 'hitokoto',
      description: '一言',
      rateLimit: { requestPerSecond: 2 },
      supportsPool: true,
    },
    {
      baseUrl: 'https://mt7dn98qqe.re.qweatherapi.com',
      name: 'qweather',
      description: '和风天气',
      rateLimit: { requestPerMonth: 50000 },
      supportsPool: true,
    },
    {
      baseUrl: 'https://www.hanlp.com',
      name: 'hanlp',
      description: 'HanLP',
      rateLimit: { requestPerMinute: 2 },
      supportsPool: false,
    },
    {
      baseUrl: 'https://api.unsplash.com',
      name: 'unsplash',
      description: 'Unsplash',
      rateLimit: { requestPerHour: 50 },
      supportsPool: true,
    },
    {
      baseUrl: 'https://southeastasia.tts.speech.microsoft.com',
      name: 'microsoft-tts',
      description: 'Microsoft TTS',
      defaultHeaders: {
        'Ocp-Apim-Subscription-Key': 'YOUR-TOKEN',
      },
      rateLimit: { requestPerSecond: 1 },
      cacheTTL: 3600 * 24,
      supportsPool: false,
    },
    {
      baseUrl: 'https://api.github.com',
      name: 'github',
      description: 'GitHub',
      defaultHeaders: {
        Authorization: 'Bearer YOUR-TOKEN',
      },
      rateLimit: { requestPerSecond: 1 },
      supportsPool: false,
    },
  ]
  const createPromises = sources.map((src) =>
    payload.create({
      collection: 'sources',
      data: { keyTemplate: '/', defaultHeaders: {}, cacheTTL: 3600, ...src },
    }),
  )
  await Promise.all(createPromises)
}

async function clearSources(payload: Payload) {
  await payload.delete({ collection: 'sources', where: {} })
}

async function seedSources(payload: Payload) {
  await clearSources(payload)
  await createSources(payload)
}

async function main() {
  const payload = await getPayload({ config })
  await seedSources(payload)
}

await main().catch((err) => {
  console.error(err)
  process.exit(1)
})
