import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  Link,
  useFetcher,
  useOutletContext,
  useLocation,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import { getSlideFromLecture } from "~/models/lecture.server";
import { slideFromLectureRoute, queueSummariesRoute } from "~/routes";
import { useEffect, useState, useRef } from "react";
import { RenderedMarkdown } from "~/components/markdownDisplayer";
import type { Slide, Lecture } from "~/models/lecture.server";
import { StatusEnum } from "~/status";
import { requireUserId } from "~/session.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireUserId(request);
  invariant(params.lectureId, "lectureId not found");
  invariant(params.slideNumber, "slideNumber not found");

  const slideNumber = Number(params.slideNumber);
  const slide = await getSlideFromLecture({
    lectureId: params.lectureId,
    slideNumber,
  });

  if (!slide) {
    throw new Response("Slide not Found", { status: 404 });
  }

  return json({
    imageData: slide.base64,
    slideId: slide.id,
    slideNumber: slide.slideNumber,
    generateStatus: slide.generateStatus,
    content: slide.content,
  });
};

export interface SummaryDisplayerManagerProps {
  slideId: Slide["id"];
  lectureId: Lecture["id"];
  slideNumber: Slide["slideNumber"];
  content: Slide["content"];
  generateStatus: Slide["generateStatus"];
}

const useSlideFetcher = (lectureId: string, slideId: string) => {
  return useFetcher({ key: `${lectureId}-${slideId}` });
};

interface SummaryDisplayerProps {
  content: string[];
  onSubmitQuery: (query: string) => void;
  isStreaming: boolean;
}

function SummaryDisplayer({
  content,
  onSubmitQuery,
  isStreaming,
}: SummaryDisplayerProps) {
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    onSubmitQuery(query);
    setQuery("");

    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }, 0);
  };
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  console.log(`isStreaming: ${isStreaming}`);

  return (
    <div className="h-full flex flex-col relative">
      <div ref={contentRef} className="flex-1 overflow-y-auto pb-20">
        {content && content.length > 0 ? (
          content.map((content, index) => (
            <div
              key={index}
              className={`p-2 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
            >
              <RenderedMarkdown source={content} />
            </div>
          ))
        ) : (
          <p className="p-2">Loading slide content...</p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-300 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-2 border rounded-lg focus:outline-none"
            placeholder="Ask a question about this slide..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isStreaming}
          >
            {isStreaming ? "Waiting..." : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SummaryDisplayerManager({
  slideId,
  lectureId,
  slideNumber,
  content,
  generateStatus,
}: SummaryDisplayerManagerProps) {
  const [displayContent, setDisplayContent] = useState<string[]>(content || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const fetcher = useSlideFetcher(lectureId, slideId);

  useEffect(() => {
    let sse: EventSource | null = null;

    // If slide not generated yet, or was in the process of generating in background, start or restart generation process
    // Background task configured to give priority to a streaming response that replaces it
    if (!generateStatus || generateStatus === StatusEnum.PROCESSING) {
      setDisplayContent([]);
      setIsStreaming(true);
      sse = new EventSource(
        `/api/sse/slideSummary?slideId=${slideId}&lectureId=${lectureId}&slideNumber=${slideNumber}`
      );

      sse.addEventListener("message", (event) => {
        setDisplayContent((prevResults) => {
          const newData = JSON.parse(event.data);
          if (prevResults.length === 0) {
            return [newData];
          }
          return [prevResults[0] + newData];
        });
      });

      sse.addEventListener("error", () => {
        if (sse) {
          sse.close();
        }
        setIsStreaming(false);
      });

      sse.addEventListener("end", () => {
        setIsStreaming(false);
        if (sse) {
          sse.close();
        }
      });
    } else if (generateStatus === StatusEnum.READY) {
      setDisplayContent(content);
      fetcher.submit(
        { lectureId, slideNumber },
        {
          method: "post",
          action: queueSummariesRoute,
        }
      );
    } else {
      setDisplayContent([`Generation Failed`]);
    }

    return () => {
      if (sse) {
        sse.close();
      }
    };
  }, []);

  const handleQuerySubmit = (query: string) => {
    setDisplayContent((prev) => [...prev, query, ""]);
    setIsStreaming(true);

    const sse = new EventSource(
      `/api/sse/slideConversation?slideId=${slideId}&query=${encodeURIComponent(query)}`
    );

    sse.addEventListener("message", (event) => {
      setDisplayContent((prev) => {
        const newData = JSON.parse(event.data);
        const updated = [...prev];
        updated[updated.length - 1] += newData;
        return updated;
      });
    });

    sse.addEventListener("error", () => {
      sse.close();
      setIsStreaming(false);
    });

    sse.addEventListener("end", () => {
      setIsStreaming(false);
      sse.close();
    });
  };

  return (
    <SummaryDisplayer
      key={`${slideId}-${lectureId}`}
      content={displayContent}
      onSubmitQuery={handleQuerySubmit}
      isStreaming={isStreaming}
    />
  );
}

interface OutletContext {
  numSlides: number;
  lectureId: string;
}

export default function SlidePage() {
  const { imageData, slideId, slideNumber, generateStatus, content } =
    useLoaderData<typeof loader>();
  const { numSlides, lectureId } = useOutletContext<OutletContext>();
  const location = useLocation();
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        <div className="w-full md:w-1/2 flex items-start">
          <img
            src={`data:image/png;base64, ${imageData}`}
            alt={`Slide ${slideNumber}`}
            className="w-full h-auto rounded-lg"
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col min-h-0">
          <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
            <SummaryDisplayerManager
              key={`${slideId}-${lectureId}`}
              slideId={slideId}
              lectureId={lectureId}
              slideNumber={slideNumber}
              content={content || []}
              generateStatus={generateStatus}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-lg font-medium">
          Slide {slideNumber} of {numSlides}
        </p>
        <div className="flex items-center space-x-4">
          {slideNumber > 1 && (
            <Link
              to={{
                pathname: slideFromLectureRoute(lectureId, slideNumber - 1),
                search: location.search,
              }}
            >
              <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Previous
              </button>
            </Link>
          )}
          {slideNumber < numSlides && (
            <Link
              to={{
                pathname: slideFromLectureRoute(lectureId, slideNumber + 1),
                search: location.search,
              }}
              preventScrollReset
            >
              <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Next
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
