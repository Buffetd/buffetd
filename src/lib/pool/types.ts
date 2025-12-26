// // types.ts
// export type Serializable = string | number | boolean | object // 简化

// export interface IPool {
//   loadFromPersistent(): Promise<void>
//   flushToPersistent(): Promise<void>
// }

// // ring buffer 简单实现
// export class RingBuffer<T> {
//   private buf: (T | undefined)[]
//   private head = 0
//   private size = 0
//   private capacity: number

//   constructor(capacity: number) {
//     this.capacity = capacity
//     this.buf = new Array<T | undefined>(capacity)
//   }

//   push(item: T) {
//     this.buf[this.head] = item
//     this.head = (this.head + 1) % this.capacity
//     if (this.size < this.capacity) {
//       this.size++
//     }
//   }

//   toArray(): T[] {
//     const result: T[] = []
//     for (let i = 0; i < this.size; i++) {
//       const idx = (this.head - this.size + i + this.capacity) % this.capacity
//       const v = this.buf[idx]
//       if (v !== undefined) result.push(v)
//     }
//     return result
//   }

//   clear() {
//     this.head = 0
//     this.size = 0
//     this.buf = new Array<T | undefined>(this.capacity)
//   }
// }
