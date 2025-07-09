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

async function someAsyncTask(id: number) {
  console.log(`Task ${id} started`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Task ${id} finished`);
}

// Run tasks through the semaphore
for (let i = 0; i < 5; i++) {
  semaphore.run(() => someAsyncTask(i));
}
```

## Development

This project uses `semantic-release` for automated versioning and package publishing. Please use the `yarn commit` command to create commit messages that follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Scripts

- `yarn build`: Build the project.
- `yarn test`: Run tests.
- `yarn test:watch`: Run tests in watch mode.
- `yarn commit`: Create a new commit with conventional-commit format.

## License

MIT
