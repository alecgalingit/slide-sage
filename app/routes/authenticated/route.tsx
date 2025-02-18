import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useSearchParams } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getLecturesByUserId } from "~/models/lecture.server";
import TopBar from "./topbar";
import Sidebar from "./sidebar";
import { sideBarSearchKey, sideBarCollapsedValue } from "~/routes";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const lectures = await getLecturesByUserId(userId);
  return json({ lectures });
};

export default function AuthenticatedPage() {
  const { lectures } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSidebarExpanded =
    searchParams.get(sideBarSearchKey) !== sideBarCollapsedValue;

  const handleSidebarToggle = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (isSidebarExpanded) {
      newSearchParams.set(sideBarSearchKey, sideBarCollapsedValue);
    } else {
      newSearchParams.delete(sideBarSearchKey);
    }
    setSearchParams(newSearchParams);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          lectures={lectures}
          isExpanded={isSidebarExpanded}
          onToggle={handleSidebarToggle}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
