import { Form, Link } from "@remix-run/react";
import { defaultRoute } from "~/routes";

const TopBar = () => {
  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <Link
        to={defaultRoute}
        className="text-white hover:text-gray-300 flex items-center space-x-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Home</span>
      </Link>

      <Form action="/logout" method="post">
        <button
          type="submit"
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </Form>
    </div>
  );
};

export default TopBar;
