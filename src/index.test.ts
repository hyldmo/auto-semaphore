import { describe, expect, it, vi } from 'vitest'
import { Semaphore } from './index'

describe('Semaphore', () => {
	it('should limit concurrency to the specified number', async () => {
		const semaphore = new Semaphore<void>(2)
		let running = 0
		const tasks: Array<Promise<void>> = []

		const task = async () => {
			const promise = semaphore.run(async () => {
				running++
				expect(running).toBeLessThanOrEqual(2)
				await new Promise(resolve => setTimeout(resolve, 10))
				running--
			})
			return promise
		}

		for (let i = 0; i < 10; i++) {
			tasks.push(task())
		}

		await Promise.all(tasks)
		expect(running).toBe(0)
	})

	it('should run all tasks', async () => {
		const semaphore = new Semaphore(3)
		const taskFn = vi.fn().mockResolvedValue(undefined)

		const tasks = Array.from({ length: 10 }, () => semaphore.run(taskFn))

		await Promise.all(tasks)

		expect(taskFn).toHaveBeenCalledTimes(10)
	})
})

describe('Semaphore enqueue', () => {
	it('should return a function that resolves to the result of the original promise', async () => {
		const semaphore = new Semaphore<number>(1)
		const result = 42
		const enqueued = await semaphore.enqueue(async () => result)
		const value = await enqueued()
		expect(value).toBe(result)
	})

	it('should respect concurrency limit with enqueue', async () => {
		const semaphore = new Semaphore<number>(2)
		let running = 0
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const enqueuedFns: Array<() => Promise<number>> = []

		for (let i = 0; i < 5; i++) {
			const enq: () => Promise<number> = await semaphore.enqueue(async () => {
				running++
				expect(running).toBeLessThanOrEqual(2)
				await new Promise(res => setTimeout(res, 10))
				running--
				return i
			})
			enqueuedFns.push(enq)
		}

		const values = await Promise.all(enqueuedFns.map(fn => fn()))
		for (let i = 0; i < 5; i++) {
			expect(values).toContain(i)
		}
		// All should have run
		expect(running).toBe(0)
	})

	it('should eventually run all enqueued tasks', async () => {
		const semaphore = new Semaphore<void>(1)
		let count = 0
		const enqueuedFns: Array<() => Promise<void>> = []
		for (let i = 0; i < 3; i++) {
			enqueuedFns.push(
				await semaphore.enqueue(async () => {
					await new Promise(res => setTimeout(res, 5))
					count++
				})
			)
		}
		await Promise.all(enqueuedFns.map(fn => fn()))
		expect(count).toBe(3)
	})
})
