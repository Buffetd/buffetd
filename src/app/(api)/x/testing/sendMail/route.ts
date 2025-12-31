import assert from 'node:assert'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

assert(process.env.TEST_API_TOKEN, 'TEST_API_TOKEN is not defined')

const payload = await getPayload({ config })

export const GET = async (): Promise<NextResponse> => {
  const headersList = await headers()
  const testApiToken = headersList.get('test-api-token')
  if (testApiToken !== process.env.TEST_API_TOKEN) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await payload.sendEmail({
    to: 'test@buffetd.com',
    subject: 'Email Testing!',
    text: `Hi, this is a test email from buffetd! ${new Date()}`,
  })
  return NextResponse.json({ message: `Email sent at ${new Date()}` })
}
