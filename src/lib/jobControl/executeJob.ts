import { runOnce } from '@/lib/jobControl/runner'

export async function executeJob(name: string) {
  const runOpts = {
    source_id: name,
    maxPerSource: 10,
    timeBudgetMs: 5_000,
  } as const

  console.info({ event: 'executeJob.runOnce.invoke', ...runOpts })

  const summary = await runOnce({ ...runOpts })

  console.info({ event: 'executeJob.runOnce.summary', summary })
}
