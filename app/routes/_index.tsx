import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { getUserId } from "~/session.server";
import { redirect, json } from "@remix-run/node";
import { defaultRoute } from "~/routes";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Logo } from "~/components/logo";
import {
  ArrowRight,
  Upload,
  Sparkles,
  PresentationIcon as PresentationChart,
  CheckCircle,
  BarChart,
  Clock,
  Star,
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
      <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Logo />
        <nav className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-base">
              Log in
            </Button>
          </Link>
          <Link to="/join">
            <Button
              variant="outline"
              size="sm"
              className="hidden text-base sm:flex"
            >
              Sign up
            </Button>
          </Link>
        </nav>
      </header>

      <main className="relative container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 md:py-28">
        <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl -z-10"></div>

        <div className="max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="mr-2 h-4 w-4" />
            Powered by Large Language Models
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Study Your{" "}
            <span className="text-primary relative">
              Slides
              <span className="absolute bottom-0 left-0 w-full h-2 bg-primary/20 rounded-full -z-10"></span>
            </span>{" "}
            at Your Own Pace
          </h1>
          <p className="mb-10 text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload lecture powerpoints or pdfs for instant, intelligent
            explanations from the most powerful AI models.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/join">
              <Button
                size="lg"
                className="w-full sm:w-auto relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  Get Started{" "}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="absolute inset-0 bg-primary/20 transform translate-y-full group-hover:translate-y-0 transition-transform"></span>
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 w-full max-w-4xl mx-auto rounded-lg border shadow-lg overflow-hidden">
          <div className="bg-secondary px-4 py-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive/60"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400/60"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/60"></div>
            <div className="px-4 py-1 bg-background/50 rounded-md text-xs text-center mx-auto w-64">
              slidesage.ai
            </div>
          </div>
          <div className="bg-background/50 h-auto p-2">
            <img
              src="/public/demo.png"
              alt="Slide Sage demonstration showing a lecture on scaling laws"
              className="w-full h-auto object-contain max-h-96"
            />
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-3 mb-2">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-semibold">PDF & PPT Support</p>
            <p className="text-sm text-muted-foreground">
              Upload all popular slide formats
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-3 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-semibold">Smart Conversations</p>
            <p className="text-sm text-muted-foreground">
              Context-aware slide discussions
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-3 mb-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-semibold">Save Lectures</p>
            <p className="text-sm text-muted-foreground">
              Revisit your past materials anytime
            </p>
          </div>
        </div>
      </main>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="mb-4 text-3xl font-bold">How It Works</h2>
          <p className="text-muted-foreground">
            Our AI-powered platform makes understanding presentations simple and
            efficient.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-medium">Upload</h3>
              <p className="text-muted-foreground">
                Upload your presentation slides in various formats including
                PowerPoint, PDF, and more
              </p>
              <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                <span>Support for all major formats</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-medium">Analyze</h3>
              <p className="text-muted-foreground">
                Our cutting-edge AI can extract and understand images, math, and
                all other lecture content
              </p>
              <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-primary">
                <Clock className="h-4 w-4" />
                <span>Results in seconds</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-4">
                <PresentationChart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-medium">Explain</h3>
              <p className="text-muted-foreground">
                Get clear explanations and summaries formatted nicely with
                markdown and latex
              </p>
              <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-primary">
                <BarChart className="h-4 w-4" />
                <span>Detailed analytics included</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
