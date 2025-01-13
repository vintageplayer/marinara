export class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const nextResolve = this.waitQueue.shift();
      if (nextResolve) nextResolve();
    } else {
      this.locked = false;
    }
  }
}

// Helper function to use mutex with async functions
export function withMutex<T>(mutex: Mutex, fn: () => Promise<T>): Promise<T> {
  return mutex.acquire()
    .then(fn)
    .finally(() => mutex.release());
}