import configPromise from '@payload-config'
import { getPayload } from 'payload'

import PageClient from './page.client'

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const sources = await payload.find({
    collection: 'sources',
    limit: 10,
  })

  return (
    <article className="pt-16 pb-24 container">
      <h2 className="text-2xl text-center mb-6">Try Buffetd</h2>

      <PageClient sources={sources} />
    </article>
  )
}
