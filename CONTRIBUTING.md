# Contributing to ClawdVault SDK

Thank you for your interest in contributing! This document provides guidelines for contributing to the ClawdVault SDK & CLI.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/clawdvault/clawdvault-sdk
cd clawdvault-sdk

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Project Structure

```
clawdvault-sdk/
├── packages/
│   ├── sdk/           # Core TypeScript client
│   └── cli/           # Command-line interface
├── package.json       # Workspace root
└── README.md
```

### Working on Packages

```bash
# Build specific package
npm run build -w @clawdvault/sdk
npm run build -w @clawdvault/cli

# Watch mode for development
npm run dev -w @clawdvault/sdk

# Link CLI for local testing
cd packages/cli && npm link
```

## Making Changes

### Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new trading method
fix: handle network timeout errors
docs: update SDK quickstart
chore: update dependencies
```

Examples:
- `feat(sdk): add getMyBalance method`
- `fix(cli): wallet path resolution on Windows`
- `docs: add troubleshooting section`

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** your changes thoroughly
5. **Commit** with a clear message
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### PR Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] New features include tests
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions

## Types of Contributions

### Bug Reports

Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)

### Feature Requests

Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives considered

### Documentation

- Fix typos or unclear explanations
- Add examples
- Improve troubleshooting guides

### Code

- Bug fixes
- New features
- Performance improvements
- Test coverage

## Testing

### Running Tests

```bash
# All tests
npm test

# SDK tests only
npm test -w @clawdvault/sdk

# Watch mode
npm test -- --watch
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '../src';

describe('ClawdVaultClient', () => {
  it('should create client with default config', () => {
    const client = createClient();
    expect(client).toBeDefined();
  });
});
```

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json` files
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm

## Questions?

- Open a GitHub issue for bugs/features
- Check existing issues before creating new ones

## Code of Conduct

Be respectful and constructive. We're all here to build cool stuff.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
