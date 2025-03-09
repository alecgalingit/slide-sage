import { Form } from "@remix-run/react";
import { defaultRoute } from "~/routes";
import { Logo } from "~/components/logo";
import { LogOut, Home } from "lucide-react";
import { Button } from "~/components/ui/button";

const TopBar = () => {
  return (
    <header className="border-b border-slate-100">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Logo to={defaultRoute} />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            <a href={defaultRoute}>
              <Home className="h-4 w-4 mr-1" />
              <span>Home</span>
            </a>
          </Button>

          <Form action="/logout" method="post">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-sm border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>Logout</span>
            </Button>
          </Form>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
