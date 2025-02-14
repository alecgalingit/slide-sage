import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { defaultRoute } from "~/routes";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  if (userId) return redirect(defaultRoute);
  return json({});
};
