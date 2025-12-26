// import type { Redis } from '@upstash/redis'

// import { IPool, Serializable } from './types'

// export class SingleEntryPool<V extends Serializable> implements IPool<V> {
//   private memoryMap = new Map<string, V>()
//   private redis: Redis
//   private persistKey: string

//   constructor(redis: Redis, config: { persistKey: string }) {
//     this.redis = redis
//     this.persistKey = config.persistKey
//   }

//   set(key: string, value: V) {
//     this.memoryMap.set(key, value)
//     // 覆盖写入持久层
//     this.redis.hset(`this.persistKey, key`, value).catch(console.error)
//   }

//   get(key: string): V | undefined {
//     return this.memoryMap.get(key)
//   }

//   async loadFromPersistent(): Promise<void> {
//     const all = await this.redis.hgetall(this.persistKey)
//     for (const [k, v] of Object.entries(all)) {
//       try {
//         this.memoryMap.set(k, JSON.parse(v))
//       } catch (e) {
//         console.error('Failed parse persistent single-entry data', e)
//       }
//     }
//   }

//   async flushToPersistent(): Promise<void> {
//     // 简单做 nothing，因为我们每次 set 都写入 Redis
//   }
// }
