import { getMetrics } from '@/actions/metrics'

export default async function Page() {
  const metrics = await getMetrics()

  const formatedMetrics: [string, string][] = [
    ['Uptime', `${metrics.uptime_s} seconds`],
    ['Cached Hit', metrics.cached.hit.toString()],
    ['Cached Miss', metrics.cached.miss.toString()],
    ['Cached Stale Served', metrics.cached.stale_served.toString()],
    ['Sources', metrics.sources.count.toString()],
    ['Entries', metrics.entries.count.toString()],
    ['Jobs Total', metrics.jobs.all.toString()],
    ['Jobs Running', metrics.jobs.running.toString()],
    ['Jobs Pending', metrics.jobs.pending.toString()],
    ['Jobs Failed', metrics.jobs.failed.toString()],
  ]

  return (
    <article className="pt-16 pb-24 container">
      <h2 className="text-2xl text-center mb-6">Status</h2>

      <div className="w-96 border rounded-lg mx-auto">
        <ul role="list" className="divide-y divide-dashed">
          {formatedMetrics.map(([key, value], index) => (
            <li key={index} className="flex items-center justify-between p-3">
              <div className="flex items-center text-body">
                <span>{key}</span>
              </div>
              <span className="text-body font-medium">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
