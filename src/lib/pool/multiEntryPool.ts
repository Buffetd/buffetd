// import type { Redis } from '@upstash/redis'

// import { IPool, RingBuffer, Serializable } from './types'

// export class MultiEntryPool<T extends Serializable> implements IPool<T> {
//   private memoryBuffer: RingBuffer<T>
//   private redis: Redis
//   private persistKey: string
//   private persistMaxSize: number

//   constructor(redis: Redis, config: { memoryCapacity: number; persistKey: string; persistMaxSize: number }) {
//     this.redis = redis
//     this.persistKey = config.persistKey
//     this.persistMaxSize = config.persistMaxSize
//     this.memoryBuffer = new RingBuffer<T>(config.memoryCapacity)
//   }

//   push(item: T) {
//     this.memoryBuffer.push(item)
//     // 这里异步写持久层 (fire & forget / 或加入队列)
//     this.redis
//       .lpush(this.persistKey, JSON.stringify(item))
//       .then(() => this.redis.ltrim(this.persistKey, 0, this.persistMaxSize - 1))
//       .catch(console.error)
//   }

//   pop(): T | undefined {
//     const arr = this.memoryBuffer.toArray()
//     return arr.length > 0 ? arr[0] : undefined
//   }

//   async loadFromPersistent(): Promise<void> {
//     const data = await this.redis.lrange(this.persistKey, 0, this.memoryBuffer['capacity'] - 1)
//     // Redis 返回最新 push 在最前面的顺序，注意 reverse
//     for (let i = data.length - 1; i >= 0; i--) {
//       try {
//         const obj = JSON.parse(data[i]) as T
//         this.memoryBuffer.push(obj)
//       } catch (e) {
//         console.error('Failed parse persistent data', e)
//       }
//     }
//   }

//   async flushToPersistent(): Promise<void> {
//     const arr = this.memoryBuffer.toArray()
//     const multi = this.redis.multi()
//     multi.del(this.persistKey)
//     if (arr.length > 0) {
//       // 重新 push 最新数据 (注意顺序)
//       for (let i = arr.length - 1; i >= 0; i--) {
//         multi.lpush(this.persistKey, JSON.stringify(arr[i]))
//       }
//       multi.ltrim(this.persistKey, 0, this.persistMaxSize - 1)
//     }
//     await multi.exec()
//   }
// }
