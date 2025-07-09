export class Semaphore<T = unknown> {
	private current: number;
	private queue: (() => void)[];
	private waiters: (() => void)[] = [];
	private max: number;
	private tasks: Promise<T>[];

	constructor(concurrencyLimit: number) {
	  this.current = 0;
	  this.queue = [];
	  this.max = concurrencyLimit;
	  this.tasks = [];
	}

	get progress() {
	  return this.tasks.length - (this.current + this.queue.length);
	}

	get total() {
	  return this.tasks.length;
	}

	get all() {
	  return this.tasks;
	}

	collect() {
	  return Promise.all(this.tasks);
	}

	async waitForSlot(): Promise<void> {
	  if (this.current < this.max) {
		this.current++;
		return;
	  }

	  return new Promise((resolve) => {
		this.waiters.push(resolve);
	  });
	}

	async enqueue(fn: () => Promise<T>): Promise<() => Promise<T>> {
	  await this.waitForSlot();
	  const promise = fn().finally(() => this.release());
	  this.tasks.push(promise);
	  return () => promise;
	}

	run(fn: () => Promise<T>): Promise<T> {
	  let resolveOuter: (value: T | PromiseLike<T>) => void;
	  let rejectOuter: (reason?: unknown) => void;
	  const outerPromise = new Promise<T>((resolve, reject) => {
		resolveOuter = resolve;
		rejectOuter = reject;
	  });
	  this.tasks.push(outerPromise);

	  const runFn = () => {
		this.current++;

		fn()
		  .then(resolveOuter, rejectOuter)
		  .finally(() => this.release());
	  };
	  if (this.current < this.max) {
		runFn();
	  } else {
		this.queue.push(runFn);
	  }
	  return outerPromise;
	}

	private release(): void {
	  this.current--;
	  if (this.waiters.length > 0) {
		const nextWaiter = this.waiters.shift();
		if (nextWaiter) {
		  this.current++; // The waiter's task gets the slot
		  nextWaiter();
		  return;
		}
	  }

	  if (this.queue.length > 0) {
		const next = this.queue.shift();
		next && next();
	  }
	}
  }
