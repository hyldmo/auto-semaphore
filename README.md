# auto-semaphore

A simple and powerful semaphore implementation for TypeScript.

## Installation

```bash
yarn add auto-semaphore
```

## Usage

```typescript
import { Semaphore } from "auto-semaphore";

const semaphore = new Semaphore(2); // Allow 2 concurrent tasks

const taskIds = [0, 1, 2, 3, 4];

// Run tasks through the semaphore
for (const task of tasks) {
  semaphore.run(async () => {
    console.log(`Task ${id} started`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Task ${id} finished`);

    // Log progress as each task completes.
    // Note: `progress` is updated after the task finishes.
    console.log(`Progress: ${semaphore.progress + 1} / ${semaphore.total}`);

    return `Task ${id} result`;
  });
};

// Collect results once all tasks are done
const results = await semaphore.collect();
console.log('\nAll tasks completed. Results:', results);

// Expected output (order of finished tasks may vary):
// Task 0 started
// Task 1 started
// Task 0 finished
// Progress: 1 / 5
// Task 2 started
// Task 1 finished
// Progress: 2 / 5
// Task 3 started
// Task 2 finished
// Progress: 3 / 5
// Task 4 started
// Task 3 finished
// Progress: 4 / 5
// Task 4 finished
// Progress: 5 / 5
//
// All tasks completed. Results: [ 'Task 0 result', 'Task 1 result', 'Task 2 result', 'Task 3 result', 'Task 4 result' ]
```

## API

### `run()`

Use `run()` to add a task to the queue. It's a "fire-and-forget" method that executes the task as soon as a slot is available. It returns a `Promise` for the task's result, but the recommended way to handle completion is by using `semaphore.collect()`.

You can also manually collect the promises returned by `run()` if you need more granular control over which tasks to await, but using `collect()` or `all` is preferred for most cases. See the section below for more details.

### `enqueue()`

Use `enqueue()` when you need to coordinate your code with the start of a task. Calling `await semaphore.enqueue(task)` will pause execution until the semaphore has a free slot and the task has *begun* running.

This provides a backpressure mechanism, ensuring that you don't queue up more work until there's capacity to start it. `enqueue` returns a `Promise` that resolves to a function, which in turn returns the `Promise` for the task's result.

```typescript
for (let i = 0; i < 5; i++) {
  // Execution will pause here until a slot is available and the task starts.
  const getResult = await semaphore.enqueue(() => someAsyncTask(i));
  console.log(`Task ${i} has been enqueued and started.`);

  // To get the result, you call the returned function
  getResult().then(result => console.log(result))
}
```

In the example above, you'll see "Task X has been enqueued and started." messages appear as slots become available, demonstrating the backpressure.

### `waitForSlot()`

The `waitForSlot()` method offers low-level access to the semaphore's slot management. When called, it returns a promise that resolves as soon as a concurrency slot becomes available. This is particularly useful when you need to manually control resource allocation before executing a task.

By calling `await semaphore.waitForSlot()`, you can pause your code until it's safe to proceed with a resource-intensive operation, without immediately queueing a function. This separates the act of acquiring a slot from executing the task, giving you more fine-grained control over your concurrency logic. Remember to call the `release` method inside a `finally` block to ensure the slot is freed up, even if errors occur.

> [!CAUTION]
> The `release` method is not exposed as part of the public API and is only available on the class instance.

```typescript
try {
	await semaphore.waitForSlot();
	// Safely execute task here
} finally {
	// The release method is private, so this is just for demonstration
	// semaphore.release();
}
```

### Collecting Results and Monitoring Progress

The `Semaphore` class provides several helpers to get results and track progress.

The primary way to get results is with `collect()`, which returns a `Promise` that resolves when all tasks are complete.

```typescript
// Wait for all tasks to finish and get results
const results = await semaphore.collect();
// Alternatively
const results = await Promise.all(semaphore.tasks)
// Or if don't want to throw if some of the tasks fail
const results = await Promise.allSettled(semaphore.tasks)
```

While tasks are running, you can monitor their status using the `progress` and `total` getters. `total` returns the number of tasks added, and `progress` returns the number of tasks that have finished.

A simple way to track progress is to log it from within the task itself, as shown in the main `Usage` example. This avoids the need for external timers and keeps the logic self-contained.

## Development

This project uses `semantic-release` for automated versioning and package publishing. Please use the `yarn commit` command to create commit messages that follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Scripts

- `yarn build`: Build the project.
- `yarn test`: Run tests.
- `yarn test:watch`: Run tests in watch mode.
- `yarn commit`: Create a new commit with conventional-commit format.

## License

MIT
