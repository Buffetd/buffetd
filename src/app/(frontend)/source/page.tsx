import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

export default async function Page() {
  const sources = await payload.find({
    collection: 'sources',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      sid: true,
      name: true,
      description: true,
      baseUrl: true,
      defaultHeaders: true,
      rateLimit: true,
      cacheTTL: true,
      supportsPool: true,
    },
  })

  return (
    <article className="pt-16 pb-24 container">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Base URL</th>
              <th>Cache TTL</th>
              <th>Supports Pool</th>
            </tr>
          </thead>

          <tbody>
            {sources.docs?.map((source) => (
              <tr key={source.sid}>
                <th>{source.name}</th>
                <td>{source.description}</td>
                <td>{source.baseUrl}</td>
                <td>{source.cacheTTL}</td>
                <td>{source.supportsPool ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
