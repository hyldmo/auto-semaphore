import { describe, it, expect, vi } from "vitest";
import { Semaphore } from "./index";

describe("Semaphore", () => {
  it("should limit concurrency to the specified number", async () => {
    const semaphore = new Semaphore(2);
    let running = 0;
    const tasks = [];

    const task = async () => {
      const promise = semaphore.run(async () => {
        running++;
        expect(running).toBeLessThanOrEqual(2);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running--;
      });
      return promise;
    };

    for (let i = 0; i < 5; i++) {
      tasks.push(task());
    }

    await Promise.all(tasks);
    expect(running).toBe(0);
  });

  it("should run all tasks", async () => {
    const semaphore = new Semaphore(3);
    const taskFn = vi.fn().mockResolvedValue(undefined);

    const tasks = Array.from({ length: 10 }, () => semaphore.run(taskFn));

    await Promise.all(tasks);

    expect(taskFn).toHaveBeenCalledTimes(10);
  });
});
