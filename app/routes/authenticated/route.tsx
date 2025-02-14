import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getLecturesByUserId } from "~/models/lecture.server";
import TopBar from "./topbar";
import Sidebar from "./sidebar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const lectures = await getLecturesByUserId(userId);
  return json({ lectures });
};

export default function AuthenticatedPage() {
  const { lectures } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col h-screen">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar lectures={lectures} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
