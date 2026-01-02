import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

export const GET = async (): Promise<NextResponse> => {
  await payload.jobs.queue({
    task: 'tFetchSourceEntry',
    input: {
      sourceName: 'hitokoto',
      key: '/?c=b',
      method: 'GET',
    },
  })
  return NextResponse.json({ message: 'Fetch source entry task created!' })
}
