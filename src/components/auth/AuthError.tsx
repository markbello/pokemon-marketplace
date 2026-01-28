import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, LogIn } from 'lucide-react';

interface AuthErrorProps {
  title?: string;
  description?: string;
  showLoginButton?: boolean;
  loginReturnTo?: string;
}

export function AuthError({
  title = 'Authentication Required',
  description = 'Please log in to access this page.',
  showLoginButton = true,
  loginReturnTo,
}: AuthErrorProps) {
  const loginUrl = loginReturnTo
    ? `/api/auth/login?returnTo=${encodeURIComponent(loginReturnTo)}`
    : '/api/auth/login';

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <LogIn className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {showLoginButton && (
            <CardContent className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <Link href={loginUrl}>Log In</Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

interface ForbiddenErrorProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function ForbiddenError({
  title = 'Access Denied',
  description = "You don't have permission to access this resource.",
  showBackButton = true,
  backHref = '/',
}: ForbiddenErrorProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {showBackButton && (
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href={backHref}>Go Back</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

interface NotFoundErrorProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function NotFoundError({
  title = 'Not Found',
  description = "The resource you're looking for doesn't exist or has been removed.",
  showBackButton = true,
  backHref = '/',
}: NotFoundErrorProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {showBackButton && (
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href={backHref}>Go Back</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
