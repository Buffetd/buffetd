import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  await payload.jobs.queue({
    task: 'runRefreshJobs',
    input: {
      sourceId: 'hitokoto',
      key: '/?c=b',
    },
  })
  return NextResponse.json({ message: 'Hello, this is the custom API root endpoint route' })
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json()
  await payload.sendEmail({
    to: 'fake@zed.com',
    subject: 'Welcome!',
    text: `Hi zed, welcome to our platform! ${JSON.stringify(body)}`,
  })
  console.info({ event: 'x.route.post', body })
  return NextResponse.json({ message: 'Hello, this is the custom API root endpoint route', body })
}
