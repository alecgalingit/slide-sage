import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { createUserSession, getUserId } from "~/session.server";
import { json, redirect } from "@remix-run/node";
import { verifyLogin } from "~/models/user.server";
import { validateEmail, safeRedirect } from "~/utils";
import { Form, Link, useSearchParams, useActionData } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { defaultRoute } from "~/routes";
import { PresentationIcon, ArrowLeft, AlertCircle, LogIn } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect(defaultRoute);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");
  const remember = formData.get("remember");

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid", password: null } },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { email: null, password: "Password is required" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { email: null, password: "Password is too short" } },
      { status: 400 }
    );
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { errors: { email: "Invalid email or password", password: null } },
      { status: 400 }
    );
  }

  return createUserSession({
    redirectTo,
    remember: remember === "on" ? true : false,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: "Login - Slide Sage" }];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || defaultRoute;
  const actionData = useActionData<typeof action>();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative">
            <PresentationIcon className="h-10 w-10 text-primary" />
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/20 animate-pulse"></div>
          </div>
          <span className="text-2xl font-bold tracking-tight">Slide Sage</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/join">
            <Button variant="outline" size="sm" className="text-base">
              Sign up
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl -z-10"></div>

        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Welcome back
            </CardTitle>
            <CardDescription className="text-center">
              Log in to your Slide Sage account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Input
                      ref={emailRef}
                      id="email"
                      required
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus={true}
                      name="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={
                        actionData?.errors?.email ? true : undefined
                      }
                      aria-describedby="email-error"
                      className={`pr-10 ${actionData?.errors?.email ? "border-destructive focus:border-destructive" : ""}`}
                    />
                    {actionData?.errors?.email && (
                      <AlertCircle className="h-5 w-5 text-destructive absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {actionData?.errors?.email ? (
                    <p className="text-sm text-destructive" id="email-error">
                      {actionData.errors.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      ref={passwordRef}
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={
                        actionData?.errors?.password ? true : undefined
                      }
                      aria-describedby="password-error"
                      className={`pr-10 ${actionData?.errors?.password ? "border-destructive focus:border-destructive" : ""}`}
                    />
                    {actionData?.errors?.password && (
                      <AlertCircle className="h-5 w-5 text-destructive absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {actionData?.errors?.password ? (
                    <p className="text-sm text-destructive" id="password-error">
                      {actionData.errors.password}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" name="remember" />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </Label>
                  </div>
                </div>

                <input type="hidden" name="redirectTo" value={redirectTo} />

                <Button
                  type="submit"
                  className="w-full relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    Log in
                    <LogIn className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="absolute inset-0 bg-primary/20 transform translate-y-full group-hover:translate-y-0 transition-transform"></span>
                </Button>
              </div>

              <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    className="text-primary hover:underline font-medium"
                    to={{
                      pathname: "/join",
                      search: searchParams.toString(),
                    }}
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Link
          to="/"
          className="mt-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to home
        </Link>
      </main>
    </div>
  );
}
