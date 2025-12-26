// const headers = ensureHeaders(parseMaybeObj<Record<string, string>>(src.defaultHeaders))
// // Do not send conditional request headers for stable endpoints
// // const dq = parseMaybeObj<Record<string, any>>(src.defaultQuery);
// const url = buildURL(src.baseUrl, pool_key, {})
// const res = await fetchWithRetry(
//   url,
//   { method: job.method, headers },
//   { attempts: 2, baseDelayMs: 200, timeoutMs: 2500 },
// )

// if (!res.ok) {
//   if (res.status === 429 || res.status === 502 || res.status === 503) {
//     const nextAttempts = (job.attempts ?? 0) + 1
//     if (nextAttempts <= MAX_ATTEMPTS) {
//       const requeue = { ...job, attempts: nextAttempts } as RefreshJob
//       await redis.rpush(queueKey, JSON.stringify(requeue))
//     }
//     console.warn({
//       event: 'runner.pool_requeue_upstream',
//       source_id: src.id,
//       key: job.key,
//       status: res.status,
//       next_attempts: nextAttempts,
//     })
//   }
//   perSource[src.id].errors++
//   console.warn({ event: 'runner.pool_origin_non_2xx', source_id: src.id, key: job.key, status: res.status })
//   continue
// }

// const { data, encoding, contentType } = await pickDataAndEncoding(res)
// const etag = res.headers.get('etag')
// const lastMod = res.headers.get('last-modified')

// const metadata = {
//   ...initMetadata,
//   cached_at: new Date().toISOString(), // Will be overwritten by setCacheEntry with the current time
//   etag: etag ?? null,
//   last_modified: lastMod ?? null,
//   origin_status: res.status,
//   content_type: contentType ?? null,
//   data_encoding: encoding,
// }
// try {
//   await poolAddItem({
//     sourceId: `${src.id}`,
//     cacheId: job.key,
//     poolKey: pool_key,
//     poolHash: keyHash(pool_key),
//     metadata,
//     data,
//   })
//   perSource[src.id].updated++
//   console.info({
//     event: 'runner.pool_item_added',
//     source_id: src.id,
//     pool_key,
//     status: res.status,
//     content_type: contentType,
//     encoding,
//   })
// } catch (error) {
//   console.error({ event: 'runner.pool_item_add_failed', source_id: src.id, key: job.key, error })
//   console.log({
//     sourceId: `${src.id}`,
//     cacheId: job.key,
//     poolKey: pool_key,
//     poolHash: keyHash(pool_key),
//     metadata,
//     data,
//   })
// }

// ---

// Regular mode: cache a single key
// const url = buildURL(src.baseUrl, job.key, {})
// const res = await fetchWithRetry(
//   url,
//   { method: 'GET', headers: new Headers(src.defaultHeaders as Record<string, string>) },
//   { attempts: 2, baseDelayMs: 200, timeoutMs: 2500 },
// )

// if (!res.ok) {
//   perSource[src.sid!].errors++
//   console.warn({ event: 'runner.origin_non_2xx', source_id: src.sid, key: job.key, status: res.status })
//   continue
// }

// const { data, encoding, contentType } = await pickDataAndEncoding(res)
// const etag = res.headers.get('etag')
// const lastMod = res.headers.get('last-modified')

// const entry: CacheEntry<Record<string, unknown>> = {
//   data,
//   metadata: {
//     source_id: src.sid!,
//     key: job.key,
//     cached_at: new Date().toISOString(), // Will be overwritten by setCacheEntry with the current time
//     expires_at: computeExpiresAt(ttl_s),
//     stale: false, // Will be recomputed by setCacheEntry
//     ttl_s,
//     etag: etag ?? null,
//     last_modified: lastMod ?? null,
//     origin_status: res.status,
//     content_type: contentType ?? null,
//     data_encoding: encoding,
//   },
// }
// await setCacheEntry(src.sid!, job.key, entry, { ttl_s })

// perSource[src.sid!].updated++

// console.info({
//   event: 'runner.cache_updated',
//   source_id: src.sid,
//   key: job.key,
//   status: res.status,
//   ttl_s: src.cacheTTL,
//   content_type: contentType,
//   encoding,
// })
