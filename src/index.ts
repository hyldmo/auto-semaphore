export class Semaphore<T = unknown> {
	private current: number
	private queue: (() => void)[]
	private waiters: (() => void)[] = []
	private max: number
	private _tasks: Promise<T>[]

	constructor(concurrencyLimit: number) {
		this.current = 0
		this.queue = []
		this.max = concurrencyLimit
		this._tasks = []
	}

	get progress() {
		return this._tasks.length - (this.current + this.queue.length)
	}

	get total() {
		return this._tasks.length
	}

	get tasks(): ReadonlyArray<Promise<T>> {
		return this._tasks
	}

	collect() {
		return Promise.all(this._tasks)
	}

	/**
	 * Blocks until a slot is available in the semaphore.
	 * This is used internally by `enqueue`, but can be used externally if you
	 * need to manually manage semaphore slots.
	 *
	 * @returns A promise that resolves when a slot is acquired.
	 */
	async waitForSlot(): Promise<void> {
		if (this.current < this.max) {
			this.current++
			return
		}

		return new Promise(resolve => {
			this.waiters.push(resolve)
		})
	}

	/**
	 * Enqueues a task and waits for it to start execution.
	 *
	 * Use `enqueue` when you need to coordinate your code with the start of a task.
	 * Calling `await semaphore.enqueue(task)` provides backpressure, pausing execution
	 * until the semaphore has a free slot and the task has begun running.
	 *
	 * It returns a `Promise` that resolves to a function, which in turn returns the
	 * `Promise` for the task's result.
	 *
	 * @param fn The async function to execute.
	 * @returns A `Promise` that resolves to a function that returns the `Promise` of the task.
	 */
	async enqueue(fn: () => Promise<T>): Promise<() => Promise<T>> {
		await this.waitForSlot()
		const promise = fn().finally(() => this.release())
		this._tasks.push(promise)
		return () => promise
	}

	/**
	 * Adds a task to the semaphore queue and returns a `Promise` for its result.
	 *
	 * Use `run` for a "fire-and-forget" approach. It adds your task to a queue and
	 * executes it as soon as a slot is available. It immediately returns a `Promise`
	 * for the task's result. This is useful when you want to dispatch a batch of
	 * tasks and await their completion later.
	 *
	 * @param fn The async function to execute.
	 * @returns A `Promise` that resolves with the result of the function.
	 */
	run(fn: () => Promise<T>): Promise<T> {
		let resolveOuter: (value: T | PromiseLike<T>) => void
		let rejectOuter: (reason?: unknown) => void
		const outerPromise = new Promise<T>((resolve, reject) => {
			resolveOuter = resolve
			rejectOuter = reject
		})
		this._tasks.push(outerPromise)

		const runFn = () => {
			this.current++

			fn()
				.then(resolveOuter, rejectOuter)
				.finally(() => this.release())
		}
		if (this.current < this.max) {
			runFn()
		} else {
			this.queue.push(runFn)
		}
		return outerPromise
	}

	private release(): void {
		this.current--
		if (this.waiters.length > 0) {
			const nextWaiter = this.waiters.shift()
			if (nextWaiter) {
				this.current++ // The waiter's task gets the slot
				nextWaiter()
				return
			}
		}

		if (this.queue.length > 0) {
			const next = this.queue.shift()
			next && next()
		}
	}
}
