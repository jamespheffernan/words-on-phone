// Fisher-Yates shuffle
export function shufflePhrases<T>(phrases: T[]): T[] {
  const arr = [...phrases];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class PhraseCursor<T> {
  private pool: T[];
  private index: number;
  private original: T[];

  constructor(phrases: T[]) {
    this.original = [...phrases];
    this.pool = shufflePhrases(this.original);
    this.index = 0;
  }

  next(): T {
    if (this.index >= this.pool.length) {
      this.pool = shufflePhrases(this.original);
      this.index = 0;
    }
    return this.pool[this.index++];
  }
} 