export class KotakRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxPerSecond: number;
  private intervalMs: number;
  private lastExecutedTimes: number[] = [];

  constructor(maxPerSecond: number = 10) {
    this.maxPerSecond = maxPerSecond;
    this.intervalMs = 1000;
  }

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      this.lastExecutedTimes = this.lastExecutedTimes.filter(t => now - t < this.intervalMs);

      if (this.lastExecutedTimes.length >= this.maxPerSecond) {
        const oldestTime = this.lastExecutedTimes[0];
        const waitTime = this.intervalMs - (now - oldestTime);
        if (waitTime > 0) {
          await new Promise(r => setTimeout(r, waitTime));
        }
      }

      const task = this.queue.shift();
      if (task) {
        this.lastExecutedTimes.push(Date.now());
        await task();
      }
    }

    this.processing = false;
  }
}

export const kotakRateLimiter = new KotakRateLimiter(10);
