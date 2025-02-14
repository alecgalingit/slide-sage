import { Link } from "@remix-run/react";
import { slideFromLectureRoute } from "~/routes";
import type { getLecturesByUserId } from "~/models/lecture.server";

interface SidebarProps {
  lectures: Awaited<ReturnType<typeof getLecturesByUserId>>;
}

const Sidebar = ({ lectures }: SidebarProps) => {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Your Lectures</h2>
      <nav className="flex flex-col space-y-2">
        {lectures.length > 0 ? (
          lectures.map((lecture) => (
            <Link
              key={lecture.id}
              to={slideFromLectureRoute(lecture.id, 1)}
              className="block p-2 rounded hover:bg-gray-700"
            >
              {lecture.title}
            </Link>
          ))
        ) : (
          <p className="text-sm text-gray-400">No lectures uploaded</p>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
