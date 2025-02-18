import { Link } from "@remix-run/react";
import { slideFromLectureRoute } from "~/routes";
import type { getLecturesByUserId } from "~/models/lecture.server";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  lectures: Awaited<ReturnType<typeof getLecturesByUserId>>;
  isExpanded: boolean;
  onToggle: () => void;
}

const Sidebar = ({ lectures, isExpanded, onToggle }: SidebarProps) => {
  return (
    <aside
      className={`bg-gray-800 text-white p-4 flex flex-col transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        {isExpanded && <h2 className="text-lg font-semibold">Your Lectures</h2>}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <nav className="flex flex-col space-y-2">
          {lectures.length > 0 ? (
            lectures.map((lecture) => (
              <Link
                key={lecture.id}
                to={slideFromLectureRoute(lecture.id, 1)}
                className="block p-2 rounded hover:bg-gray-700 truncate"
                title={lecture.title}
              >
                {lecture.title}
              </Link>
            ))
          ) : (
            <p className="text-sm text-gray-400">No lectures uploaded</p>
          )}
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;
