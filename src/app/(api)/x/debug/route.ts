import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

export const GET = async (): Promise<NextResponse> => {
  await payload.jobs.run()
  return NextResponse.json({ message: 'Run All Jobs' })
}
