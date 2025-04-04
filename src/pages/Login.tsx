
import React from 'react';
import { authService } from '../services/authService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  const handleLogin = () => {
    authService.login();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Sign in using your organizational credentials with PingFederate SSO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2 text-center">
            <h3 className="text-lg font-medium">Single Sign-On</h3>
            <p className="text-sm text-gray-500">
              Click the button below to sign in using your organizational SSO credentials.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin}>
            Sign in with SSO
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
