import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { PresentationIcon, ArrowLeft, AlertCircle, LogIn } from "lucide-react";

import { createUser, getUserByEmail } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

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

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return json(
      {
        errors: {
          email: "A user already exists with this email",
          password: null,
        },
      },
      { status: 400 }
    );
  }

  const user = await createUser(email, password);

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: "Sign Up - Slide Sage" }];

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
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
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-base">
              Log in
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
              Create an account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your details below to create your account
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
                      autoComplete="new-password"
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
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  )}
                </div>

                <input type="hidden" name="redirectTo" value={redirectTo} />

                <Button
                  type="submit"
                  className="w-full relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    Create Account
                    <LogIn className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="absolute inset-0 bg-primary/20 transform translate-y-full group-hover:translate-y-0 transition-transform"></span>
                </Button>
              </div>

              <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    className="text-primary hover:underline font-medium"
                    to={{
                      pathname: "/login",
                      search: searchParams.toString(),
                    }}
                  >
                    Log in
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
