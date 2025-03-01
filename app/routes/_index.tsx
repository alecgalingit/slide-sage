import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { getUserId } from "~/session.server";
import { redirect, json } from "@remix-run/node";
import { defaultRoute } from "~/routes";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  ArrowRight,
  Upload,
  Sparkles,
  PresentationIcon as PresentationChart,
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect(defaultRoute);
  return json({});
};

export const meta: MetaFunction = () => {
  return [
    { title: "Slide Sage - AI-Powered Slide Explanations" },
    {
      name: "description",
      content: "Upload your slides and get AI-powered explanations instantly.",
    },
  ];
};

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <PresentationChart className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Slide Sage</span>
        </div>
        <nav>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-24">
        <div className="max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Understand Your <span className="text-primary">Slides</span> with AI
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Upload your presentations and get instant, intelligent explanations
            powered by AI.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/join">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-medium">Upload</h3>
              <p className="text-muted-foreground">
                Upload your presentation slides in various formats
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-medium">Analyze</h3>
              <p className="text-muted-foreground">
                Our AI analyzes and understands your content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <PresentationChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-medium">Explain</h3>
              <p className="text-muted-foreground">
                Get clear explanations and insights for each slide
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Slide Sage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
