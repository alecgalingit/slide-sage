import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
//import { useOptionalUser } from "~/utils";
import { Link } from "@remix-run/react";
import { getUserId } from "~/session.server";
import { redirect, json } from "@remix-run/node";
import { dashboardRoute } from "~/routes";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect(dashboardRoute);
  return json({});
};

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <main className="flex h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold sm:text-8xl lg:text-9xl">
          <span className="block uppercase text-yellow-500 drop-shadow-md">
            AI Slides
          </span>
        </h1>
        <div className="mt-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 px-40">
            <Link
              to="/join"
              className="rounded-md border bg-white px-4 py-3 font-medium text-yellow-700 shadow hover:bg-yellow-50"
            >
              Sign up
            </Link>
            <Link
              to="/login"
              className="rounded-md bg-yellow-500 px-4 py-3 font-medium text-white hover:bg-yellow-600"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
