# Contributing to Pokemon Marketplace

Thank you for your interest in contributing to the Pokemon Marketplace! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Basic knowledge of Next.js, TypeScript, and React

### Development Setup
```bash
# Clone the repository
git clone https://github.com/markbello/pokemon-marketplace.git
cd pokemon-marketplace

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## 🏷️ GitHub Labels System

### Required Labels for All Issues
Every issue must have:
- **One priority label**: `priority: critical`, `priority: high`, `priority: medium`, or `priority: low`
- **One type label**: `type: bug`, `type: feature`, `type: enhancement`, or `type: documentation`

### Optional Component Labels (Multiple Allowed)
- `component: frontend` - React components, UI/UX, styling
- `component: backend` - API endpoints, server logic, database
- `component: mobile` - Mobile-specific features (future)
- `component: auth` - Authentication, authorization, user management
- `component: payments` - Payment processing, Stripe integration

### Status Labels for Workflow
- `status: ready-for-review` - PR is ready for code review
- `status: needs-work` - Changes requested, work in progress
- `status: blocked` - Cannot proceed due to dependency/blocker

### Label Examples
```yaml
# High-priority authentication bug
labels: ["priority: high", "type: bug", "component: auth"]

# Medium-priority frontend feature
labels: ["priority: medium", "type: feature", "component: frontend"]

# Documentation enhancement
labels: ["priority: low", "type: documentation"]
```

## 📝 Issue Guidelines

### Creating Issues
- Search existing issues first to avoid duplicates
- Use descriptive titles that summarize the problem/request
- Apply appropriate labels (priority + type minimum)
- Provide details: steps to reproduce, expected behavior, screenshots
- Reference related issues using `#issue-number`

### Issue Templates
Use our issue templates for:
- 🐛 **Bug Reports**: Detailed problem descriptions
- ✨ **Feature Requests**: New functionality proposals
- 🔥 **Epics**: Large features spanning multiple issues
- 📚 **Documentation**: Documentation updates

## 🔄 Pull Request Process

### Before Creating a PR
- Create an issue first (unless it's a trivial fix)
- Create a feature branch from `main`
- Follow naming convention: `feature/PM-123-short-description` or `fix/PM-123-bug-description`
- Write tests for new functionality
- Update documentation as needed

### PR Requirements
- Descriptive title referencing the issue (e.g., "PM-123: Add Pokemon card search filters")
- Link to related issue using "Closes #123" or "Fixes #123"
- Apply appropriate labels matching the linked issue
- All tests pass locally
- Code follows project conventions (ESLint, Prettier)
- No merge conflicts with main branch

### Review Process
- Automated checks must pass (CI, tests, linting)
- At least one approving review required
- Address review feedback promptly
- Update status labels as needed (`status: needs-work`, `status: ready-for-review`)
- Squash and merge or merge commit (both allowed)

## 💻 Development Guidelines

### Code Style
- TypeScript for all new code
- ESLint + Prettier for consistent formatting
- Functional components with hooks
- Descriptive variable names and comments for complex logic

### Commit Messages
Follow conventional commits format:
```
type(scope): description

# Examples:
feat(auth): add Pokemon trainer registration
fix(search): resolve filter reset bug
docs(readme): update setup instructions
```

### File Structure
```
src/
├── app/                 # Next.js 15 App Router
├── components/
│   ├── ui/              # Reusable UI components
│   └── marketplace/     # Business logic components
├── lib/                 # Utilities and configurations
└── types/               # TypeScript type definitions
```

## 🤖 AI Tool Guidelines

### For Claude Code and Similar Tools:
When creating issues or PRs programmatically:
- Always include required labels: priority + type
- Add relevant component labels based on files modified
- Use descriptive titles with issue references
- Follow our branch naming conventions
- Reference related Jira tickets when applicable

Example:
```bash
# Good AI-generated issue
gh issue create --title "PM-45: Implement Pokemon card condition validation" \
  --label "priority: medium,type: feature,component: backend" \
  --body "Implement server-side validation for Pokemon card condition ratings..."

# Good AI-generated branch
git checkout -b feature/PM-45-card-condition-validation
```

## 🚨 Security

### Reporting Security Issues
- Do not create public issues for security vulnerabilities
- Email security concerns to [security email]
- Use `priority: critical` label for security-related issues after they're resolved

### Security Best Practices
- Never commit API keys, passwords, or sensitive data
- Use environment variables for configuration
- Validate all inputs on both client and server
- Follow OWASP guidelines for web security

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **Slack #dev**: Quick questions and discussions
- **Jira Project**: https://pokemonmarketplace.atlassian.net

### Code Review
- Be respectful and constructive in feedback
- Explain the "why" behind suggested changes
- Ask questions if something is unclear
- Approve promptly when ready

## 📋 Definition of Done

A feature is considered complete when:
- Code implemented and tested
- Tests written and passing
- Documentation updated
- Code reviewed and approved
- Labels updated to reflect current status
- Deployed to staging and verified
- Issue closed with appropriate labels

---

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run test            # Run tests
npm run lint            # Check code style
npm run type-check      # TypeScript validation

# Git workflow
git checkout -b feature/PM-123-description
git add .
git commit -m "feat(scope): description"
git push origin feature/PM-123-description
# Create PR via GitHub UI
```

### Label Quick Reference
- **Priority**: `critical` | `high` | `medium` | `low`
- **Type**: `bug` | `feature` | `enhancement` | `documentation`  
- **Component**: `frontend` | `backend` | `mobile` | `auth` | `payments`
- **Status**: `ready-for-review` | `needs-work` | `blocked`

---

Thank you for contributing to Pokemon Marketplace! 🎉
