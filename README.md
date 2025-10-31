# Pokemon Marketplace

A modern, secure marketplace for buying and selling Pokemon trading cards built with Next.js.

## 🚀 Features

- **Secure Trading**: Escrow-protected transactions with buyer/seller verification
- **Responsive Design**: Optimized for desktop, tablet, and mobile browsers
- **Advanced Search**: Filter by set, rarity, condition, and price
- **Authentication**: Secure user registration with role-based access
- **Payment Processing**: Integrated payment system with seller payouts

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe Connect for marketplace transactions
- **Hosting**: Vercel

## 📱 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database
- Stripe account

### Installation

```bash
# Clone the repository
git clone https://github.com/markbello/pokemon-marketplace.git
cd pokemon-marketplace

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 📋 Development Workflow

1. Create feature branch from `main`
2. Make changes and test locally
3. Run tests: `npm run test`
4. Create pull request
5. Code review and approval
6. Merge to `main` triggers staging deployment
7. Manual promotion to production

## 🔗 Links

- **Jira Project**: https://pokemonmarketplace.atlassian.net/jira/software/projects/PM
- **Figma Designs**: [Link to be added]
- **Staging Environment**: [Link to be added]
- **Production**: [Link to be added]

## 📞 Support

For questions or issues, please create a ticket in our [Jira project](https://pokemonmarketplace.atlassian.net) or reach out in the #dev Slack channel.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development process, coding standards, and how to submit pull requests.

## 📚 Learn More

To learn more about Next.js and the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js) - feedback and contributions welcome
- [NextAuth.js Documentation](https://next-auth.js.org/) - authentication for Next.js
- [Prisma Documentation](https://www.prisma.io/docs) - modern database toolkit
- [Stripe Connect Documentation](https://stripe.com/docs/connect) - marketplace payments

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
