# Contributing to Student Apartments

Thank you for your interest in contributing to Student Apartments! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, browser, Node version)

## 💡 Suggesting Features

Feature suggestions are welcome! Please:

- Check if the feature has already been suggested
- Provide a clear use case
- Explain why this feature would be useful
- Consider how it fits with existing features

## 🔧 Development Process

### 1. Fork and Clone

```bash
git clone https://github.com/yourusername/student-apartments.git
cd student-apartments
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Set Up Development Environment

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your credentials
npm run dev
```

### 4. Make Your Changes

- Follow the existing code style
- Write clear, commented code
- Add tests for new features
- Update documentation as needed

### 5. Test Your Changes

```bash
# Run type checking
npm run type-check

# Run tests
npm run test

# Run E2E tests
npm run e2e

# Run linting
npm run lint
```

### 6. Commit Your Changes

Use conventional commits:

```bash
git commit -m "feat: add user profile editing"
git commit -m "fix: resolve search pagination issue"
git commit -m "docs: update API documentation"
git commit -m "test: add tests for payment flow"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshots (if UI changes)
- Testing steps

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types from `types/` directory

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: 'student' | 'owner' | 'admin';
}

// ❌ Bad
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Add JSDoc comments for complex components

```typescript
// ✅ Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant }))} onClick={onClick}>
      {children}
    </button>
  );
}
```

### File Organization

```
app/
  (app)/              # Student routes
  (owner)/            # Owner routes
  (admin)/            # Admin routes
  api/                # API routes
components/
  ui/                 # Reusable UI components
  forms/              # Form components
  layout/             # Layout components
lib/
  supabase/           # Supabase utilities
  stripe/             # Stripe utilities
  validation/         # Zod schemas
services/
  search-svc/         # Search service
  payments-svc/       # Payments service
```

### API Routes

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Validate input with Zod
- Return proper status codes
- Handle errors gracefully

```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Get user
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await req.json();
    const validated = schema.parse(body);

    // 3. Business logic
    const result = await someService(validated);

    // 4. Return response
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Database

- Use Supabase queries
- Implement Row Level Security
- Use transactions for multi-step operations
- Add indexes for frequently queried columns

```typescript
// ✅ Good
const { data, error } = await supabase
  .from('apartments')
  .select('*')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: false });
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('calculatePrice', () => {
  it('should calculate correct price with fees', () => {
    const result = calculatePrice(1000, 0.1);
    expect(result).toBe(1100);
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can sign up', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 📚 Documentation

- Update README.md for major changes
- Add JSDoc comments for public APIs
- Update API documentation
- Include code examples

## 🎯 Priority Areas

We especially welcome contributions in:

- **Testing**: Increase test coverage
- **Accessibility**: Improve a11y
- **Performance**: Optimize bundle size
- **Documentation**: Improve docs
- **Mobile**: Responsive design improvements
- **i18n**: Multi-language support

## ❓ Questions?

- Check existing documentation
- Search closed issues
- Ask in discussions
- Email: dev@studentapartments.com

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
