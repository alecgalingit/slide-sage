import { Link } from "@remix-run/react";
import { slideFromLectureRoute } from "~/routes";
import type { getLecturesByUserId } from "~/models/lecture.server";
import {
  ChevronLeft,
  ChevronRight,
  PresentationIcon,
  FileText,
} from "lucide-react";
import { Button } from "~/components/ui/button";

interface SidebarProps {
  lectures: Awaited<ReturnType<typeof getLecturesByUserId>>;
  isExpanded: boolean;
  onToggle: () => void;
}

const Sidebar = ({ lectures, isExpanded, onToggle }: SidebarProps) => {
  return (
    <aside
      className={`border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 ease-in-out shadow-sm ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between py-4 px-4 border-b border-gray-200 dark:border-gray-800">
        {isExpanded && (
          <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            Your Lectures
          </h2>
        )}
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            !isExpanded ? "ml-auto" : ""
          }`}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </Button>
      </div>

      {isExpanded ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <nav className="mt-3 flex-1 overflow-y-auto">
            {lectures.length > 0 ? (
              <div className="px-2">
                {lectures.map((lecture) => (
                  <Link
                    key={lecture.id}
                    to={slideFromLectureRoute(lecture.id, 1)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-1 group transition-colors"
                    title={lecture.title}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <PresentationIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate">{lecture.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                  No lectures yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload a presentation to get started
                </p>
              </div>
            )}
          </nav>
        </div>
      ) : (
        <div className="flex flex-col items-center pt-6">
          {/* Removed the lecture icon when sidebar is collapsed */}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
