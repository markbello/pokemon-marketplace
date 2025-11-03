'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ShoppingBag, Shield, TrendingUp } from 'lucide-react';

interface WelcomeStepProps {
  onComplete: () => void;
  userName?: string;
}

export function WelcomeStep({ onComplete, userName }: WelcomeStepProps) {
  const features = [
    {
      icon: ShoppingBag,
      title: 'Browse & Buy',
      description: 'Discover rare Pokemon cards from verified sellers worldwide',
    },
    {
      icon: TrendingUp,
      title: 'Sell Your Cards',
      description: 'List your collection and reach buyers instantly',
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'Safe payments and verified sellers for peace of mind',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold">
            Welcome{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Your profile is set up. Let&apos;s explore what you can do.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/50 p-6">
        <h3 className="mb-2 font-semibold">Quick Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Complete your seller profile to start listing cards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Browse featured collections and trending cards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Save your favorite cards to your wishlist</span>
          </li>
        </ul>
      </div>

      <Button onClick={onComplete} className="w-full" size="lg">
        Start Exploring
      </Button>
    </div>
  );
}

