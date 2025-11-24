# Pokemon Marketplace

A modern, secure marketplace for buying and selling Pokemon trading cards built with Next.js.

## 🚀 Features

- **Secure Trading**: Escrow-protected transactions with buyer/seller verification
- **Responsive Design**: Optimized for desktop, tablet, and mobile browsers
- **Advanced Search**: Filter by set, rarity, condition, and price
- **Authentication**: Secure user registration with role-based access (Auth0)
- **Payment Processing**: Stripe integration with customer management and webhooks
- **Order Management**: Complete order tracking with status updates and audit logging
- **Account Management**: User profile, purchase history, and preferences pages
- **Avatar Upload**: Cloudinary integration for user profile pictures

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Authentication**: Auth0 with Next.js
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe Connect for marketplace transactions
- **Hosting**: Vercel

## 📱 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- **Vercel CLI**: `npm install -g vercel`
- Access to the pokemonmarketplace Vercel team (contact team lead)
- Auth0 account credentials (get from team lead)

### Setup Instructions

#### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/markbello/pokemon-marketplace.git
cd pokemon-marketplace

# Install dependencies
npm install
```

#### 2. Environment Variables

**Important**: All environment variables must be set up using Vercel CLI to ensure database connections are configured correctly.

```bash
# Link your local project to Vercel project
vercel link

# Pull environment variables from Vercel (creates .env.development.local)
vercel env pull
```

**Copy DATABASE_URL to .env.local:**

After running `vercel env pull`, you'll get a `.env.development.local` file. Copy the `DATABASE_URL` from that file to your `.env.local` file (create it if it doesn't exist).

Your `.env.local` should contain:

```bash
# Auth0 Configuration (get from team lead)
AUTH0_SECRET="[get-from-team-lead]"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="[get-from-team-lead]"
AUTH0_CLIENT_ID="[get-from-team-lead]"
AUTH0_CLIENT_SECRET="[get-from-team-lead]"
AUTH0_DOMAIN="[get-from-team-lead]"
AUTH0_MANAGEMENT_CLIENT_ID="[get-from-team-lead]"
AUTH0_MANAGEMENT_CLIENT_SECRET="[get-from-team-lead]"

# Database - Copied from .env.development.local (Vercel CLI output)
DATABASE_URL="postgresql://[copied-from-vercel-output]"

# Stripe Configuration (get from team lead)
STRIPE_SECRET_KEY="sk_test_[get-from-team-lead]"
STRIPE_WEBHOOK_SECRET="whsec_[get-from-team-lead]"

# Cloudinary (for avatar uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="[get-from-team-lead]"
```

**Note**: Vercel automatically provides `DATABASE_URL` for preview and production deployments. Local development uses the staging database connection string.

#### 3. Database Setup (local dev)

By default, this project assumes a PostgreSQL database specified by `DATABASE_URL`. For a smoother Prisma experience and to avoid shadow database issues, it’s recommended to use a **local Postgres instance** for development and apply migrations to staging/production separately.

##### Option A (recommended): Local Postgres via Docker

1. Start the local database:

```bash
docker compose up -d db
```

2. Set `DATABASE_URL` in `.env.local` to point at the local DB:

```bash
DATABASE_URL="postgresql://pokemon:pokemon@localhost:5432/pokemon_marketplace_dev?schema=public"
```

3. Apply all existing migrations and generate the Prisma client:

```bash
npm run db:migrate
npm run db:generate

# (Optional) Seed database with test data
npm run db:seed
```

##### Option B: Shared staging database

If you must point `DATABASE_URL` at the shared staging database, be aware that Prisma’s shadow database can get into a bad state more easily (e.g., enum/types already existing). In that case, you may need to manually drop the shadow DB on the server when migrations fail. The recommended workflow is Option A.

**Important**: Always use `npm run db:migrate` for schema changes in development. This creates proper migration files that can be tracked in git and applied to production (via `npm run db:deploy`).

#### Troubleshooting Database Migrations

**If you get a migration error saying a column already exists:**

This usually happens when `db:push` was used instead of `db:migrate`, or the schema was changed manually. To fix:

1. Check migration status:
   ```bash
   npm run db:migrate:status
   ```

2. If the migration failed because the column/table already exists, mark it as applied:
   ```bash
   npm run db:migrate:resolve:applied "migration_name"
   ```

3. Verify the status:
   ```bash
   npm run db:migrate:status
   ```

**If you get a shadow database error during migration:**

The shadow database is used by Prisma to validate migrations. If you encounter errors:

1. Check if the issue is with an existing migration (like duplicate enum types)
2. If needed, you can reset the shadow database or resolve the specific migration issue
3. For production, always test migrations in a staging environment first

**Best Practices:**

- ✅ **Always use `db:migrate`** for schema changes that need to be tracked
- ✅ **Never use `db:push`** for changes that will go to production (it doesn't create migration files)
- ✅ **Check migration status** before deploying to catch issues early
- ✅ **Test migrations** in a staging environment before production

#### 4. Stripe Webhook Setup (for Local Testing)

To test Stripe webhooks locally, you'll need the Stripe CLI:

```bash
# Install Stripe CLI (if not already installed)
# macOS: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli
```

**⚠️ Important: Account Mismatch Issue**

The Stripe CLI must be authenticated to the **same Stripe account** as your app's `STRIPE_SECRET_KEY`. If they don't match, webhooks won't be received for your app's payments.

**Option A: Use API key directly (recommended)**
```bash
# Load your env and run with explicit API key
source .env.local && stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY"
```

**Option B: Login to correct account**
```bash
# First, check which account the CLI is using
stripe config --list | grep account_id

# Verify your app's account
source .env.local && curl -s https://api.stripe.com/v1/account -u "$STRIPE_SECRET_KEY:" | grep '"id"'

# If they don't match, logout and re-login to the correct account
stripe logout
stripe login
# Then authenticate with the same account that owns your STRIPE_SECRET_KEY
```

After starting the listener, it will output a webhook signing secret. Update your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET="whsec_[from-stripe-cli-output]"
```

**Note**: You need to restart your dev server after updating `STRIPE_WEBHOOK_SECRET`.

#### 5. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🗄️ Development Commands

### Database Operations (Always use these scripts)

**Important**: Always use `npm run db:*` scripts, never direct `npx prisma` commands. The scripts ensure `.env.local` is properly loaded and keep migrations consistent across local/staging/prod.

- `npm run db:migrate` - Create and apply new migrations to your **local** database (e.g., `npm run db:migrate -- --name pm33-listings`)
- `npm run db:generate` - Regenerate Prisma client after schema changes
- `npm run db:studio` - Open Prisma Studio (database GUI) to view/edit data
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database (⚠️ **WARNING**: deletes all data)
- `npm run db:deploy` - Apply migrations to remote database (staging/production)

### Next.js

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🔧 Troubleshooting

### "Environment variable not found: DATABASE_URL"

- Make sure you copied `DATABASE_URL` from `.env.development.local` to `.env.local`
- Always use `npm run db:*` scripts, not direct `npx prisma` commands
- The scripts use `dotenv-cli` to read `.env.local` automatically

### "Access denied" when running `vercel link`

- Contact team lead to be added to the Vercel team
- Make sure you're logged in: `vercel login`

### Database connection fails

- Verify your `DATABASE_URL` in `.env.local` matches the Vercel output
- Try pulling fresh environment variables: `vercel env pull`
- Check that you're using the staging database connection string (local dev uses staging DB)

### Prisma client not found

- Run `npm run db:generate` after schema changes
- Make sure you've run `npm install` to install all dependencies

### Stripe webhooks not working locally

- Make sure `stripe listen` is running in a separate terminal
- Verify the webhook endpoint is correct: `localhost:3000/api/webhooks/stripe`
- Check that `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the output from `stripe listen`
- Restart your dev server after updating `STRIPE_WEBHOOK_SECRET`
- Check server logs for webhook events and errors

### Stripe CLI not receiving webhooks for your payments

**This is usually an account mismatch issue.** The CLI might be logged into a different Stripe account than your app.

1. Check which account the CLI is using:
   ```bash
   stripe config --list | grep account_id
   ```

2. Check which account your app uses:
   ```bash
   source .env.local && curl -s https://api.stripe.com/v1/account -u "$STRIPE_SECRET_KEY:" | grep '"id"'
   ```

3. If the account IDs don't match, use Option A from the webhook setup:
   ```bash
   source .env.local && stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY"
   ```

### Test payments not updating order status

- Ensure webhooks are being received (check `stripe listen` output)
- **Verify the CLI is on the same Stripe account as your app** (see above)
- Check that the webhook secret is correctly configured
- Verify the order exists in the database with the correct `stripeSessionId`
- Check server logs for webhook processing errors

## 📁 Environment Files

- `.env.local` - Your local environment variables (Next.js runtime + database) - **Never commit this**
- `.env.development.local` - Generated by Vercel CLI (reference only) - **Never commit this**
- `.env.example` - Template for required variables (committed to git)

**Never commit actual environment files to git.**

## 👥 Team Onboarding

### New Developer Setup

1. **Install Prerequisites:**
   ```bash
   npm install -g vercel
   ```

2. **Get Access:**
   - Contact team lead to be added to the Vercel team
   - Get Auth0 credentials from team lead

3. **Clone and Setup:**
   ```bash
   git clone [repo]
   cd pokemon-marketplace
   npm install
   ```

4. **Environment Variables:**
   ```bash
   vercel link
   vercel env pull
   # Copy DATABASE_URL from .env.development.local to .env.local
   # Get other environment variables from team lead
   ```

5. **Database Setup:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed  # Optional test data
   ```

6. **Start Development:**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

1. Create feature branch from `main`
2. Make changes and test locally
3. Run linting: `npm run lint`
4. Format code: `npm run format`
5. Create pull request
6. Code review and approval
7. Merge to `main` triggers staging deployment
8. Manual promotion to production

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
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs) - authentication for Next.js
- [Prisma Documentation](https://www.prisma.io/docs) - modern database toolkit
- [Stripe Documentation](https://stripe.com/docs) - payment processing
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli) - local webhook testing
- [Cloudinary Documentation](https://cloudinary.com/documentation) - image upload and management

## 🧪 Testing Payments Locally

To test the payment flow:

1. **Start the Stripe CLI webhook listener** (in a separate terminal):
   ```bash
   # Use your app's API key to ensure correct account
   source .env.local && stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY"
   ```

2. **Update your `.env.local`** with the webhook secret from the CLI output

3. **Restart your dev server** to load the new webhook secret

4. **Navigate to** `/test-stripe` in your browser (requires authentication)

5. **Make a test payment** using Stripe test card: `4242 4242 4242 4242`

6. **Check the webhook logs** - you should see:
   - In CLI terminal: `checkout.session.completed` with `[200]` response
   - In server logs: `[Webhook] Listing marked as SOLD` and `[Webhook] Order ID: ... Status: PAID`

7. **View your purchases** at `/purchases` to see the order status update

**Troubleshooting**: If webhooks aren't being received, see "Stripe CLI not receiving webhooks" in the Troubleshooting section - it's usually an account mismatch issue.

## 📄 Key Pages & Routes

- `/profile` - User profile management (name, avatar, phone)
- `/purchases` - Purchase history with sortable table
- `/account/preferences` - Notification and privacy preferences
- `/test-stripe` - Test payment page (development only)
- `/api/test-payment` - Create test payment checkout session
- `/api/webhooks/stripe` - Stripe webhook endpoint for payment events

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
