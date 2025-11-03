# Auth0 Setup Instructions

## Quick Setup

1. **Go to Auth0 Dashboard**: https://manage.auth0.com/dashboard/

2. **Create Application**:
   - Click "Applications" → "Create Application"
   - Choose "Regular Web Application"
   - Give it a name (e.g., "Pokemon Marketplace")

3. **Configure Application Settings**:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`

4. **Update `.env.local` file**:
   - Open `.env.local` in the project root
   - Replace the following values:
     - `AUTH0_DOMAIN`: Your Auth0 domain (e.g., `your-tenant.auth0.com`)
     - `AUTH0_CLIENT_ID`: Your Application's Client ID
     - `AUTH0_CLIENT_SECRET`: Your Application's Client Secret
     - `AUTH0_SECRET`: Already generated (keep this value)

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Test the integration**:
   - Open http://localhost:3000
   - Click "Log In" to test authentication
   - After logging in, you should see your profile information

## Troubleshooting

- **404 errors on login/logout**: Make sure your middleware.ts file is in the root directory
- **Configuration errors**: Verify all environment variables in `.env.local` are set correctly
- **"Invalid state" errors**: Clear your browser cookies and try again

## What's Been Set Up

✅ Auth0 Next.js SDK installed  
✅ Middleware configured  
✅ Login/Logout components created  
✅ Profile component created  
✅ Main page integrated with Auth0  
✅ Beautiful UI styling applied  
✅ Auth0Provider added to layout  

You just need to complete the Auth0 application configuration in the dashboard!
