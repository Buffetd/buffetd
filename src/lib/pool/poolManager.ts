// import type { Redis } from '@upstash/redis'

// import { IPool, Serializable } from './types'

// export interface MultiPoolConfig {
//   memoryCapacity: number
//   persistKey: string
//   persistMaxSize: number
// }

// export interface SinglePoolConfig {
//   persistKey: string
// }

// export class PoolManager {
//   private pools = new Map<string, IPool>()
//   private redis: Redis

//   constructor(redis: Redis) {
//     this.redis = redis
//   }

//   registerMultiPool<T>(name: string, config: MultiPoolConfig) {
//     const p = new MultiEntryPool<T>(this.redis, config)
//     this.pools.set(name, p)
//   }

//   registerSinglePool<V extends Serializable>(name: string, config: SinglePoolConfig) {
//     const p = new SingleEntryPool<V>(this.redis, config)
//     this.pools.set(name, p)
//   }

//   getPool<T>(name: string): IPool<T> | undefined {
//     return this.pools.get(name)
//   }

//   async loadAll() {
//     for (const pool of this.pools.values()) {
//       await pool.loadFromPersistent()
//     }
//   }

//   async flushAll() {
//     for (const pool of this.pools.values()) {
//       await pool.flushToPersistent()
//     }
//   }
// }
