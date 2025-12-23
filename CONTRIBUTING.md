# Contributing Guide

## Getting Started

1. Fork the repository
2. Clone locally
3. Run `npm install`
4. Create a feature branch: `git checkout -b feature/my-feature`
5. Make changes and commit: `git commit -m "feat: describe your change"`
6. Push to your fork: `git push origin feature/my-feature`
7. Submit a Pull Request

## Development Setup

```bash
npm install
npm run dev
```

Server runs at `http://localhost:5173`

## Code Standards

### Linting
Run ESLint before committing:
```bash
npm run lint
npm run lint:fix
```

### Formatting
Format code automatically:
```bash
npm run format
```

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting only
- `refactor:` Code restructuring
- `test:` Adding/updating tests
- `chore:` Build process, dependencies

### Code Style
- Use ES6+ syntax
- Use meaningful variable names
- Comment complex logic
- Keep functions small and focused
- No console.logs in production code (use logger module)

## Testing

Add tests to `src/utils.test.js` for utility functions:

```javascript
assert(condition, 'Test description');
```

Run: `npm test` (when test runner is configured)

## File Organization

- `src/` - JavaScript modules
- `index.html` - HTML entry point
- `dist/` - Build output (generated)
- `node_modules/` - Dependencies (generated)

## Pull Request Template

```
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test your changes

## Checklist
- [ ] Code follows style guidelines
- [ ] No new warnings generated
- [ ] Changes tested locally
- [ ] Documentation updated
```

## Bug Reports

Include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser/environment info
4. Screenshots if applicable

## Feature Requests

Include:
1. Use case
2. Proposed solution
3. Alternative approaches considered
4. Impact on existing features
