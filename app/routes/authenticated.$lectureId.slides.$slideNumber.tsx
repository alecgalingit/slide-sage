import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useParams, useFetcher } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getSlideFromLecture, getLectureById } from "~/models/lecture.server";
import { slideFromLectureRoute, queueSummariesRoute } from "~/routes";
import { useEffect, useState, useRef } from "react";
import { RenderedMarkdown } from "~/components/markdownDisplayer";
import type { Slide, Lecture } from "~/models/lecture.server";
import { StatusEnum } from "~/status";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.lectureId, "lectureId not found");
  invariant(params.slideNumber, "slideNumber not found");

  const lecture = await getLectureById(params.lectureId);
  if (!lecture || userId !== lecture.userId) {
    throw new Response("Lecture not found", {
      status: 404,
    });
  }

  if (!lecture.numSlides) {
    throw new Response("Number of slides not found", { status: 404 });
  }

  const numSlides = lecture.numSlides;

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
    numSlides,
    generateStatus: slide.generateStatus,
    content: slide.content,
  });
};

export interface SlideContentManagerProps {
  slideId: Slide["id"];
  lectureId: Lecture["id"];
  slideNumber: Slide["slideNumber"];
  content: Slide["content"];
  generateStatus: Slide["generateStatus"];
}

const useSlideFetcher = (lectureId: string, slideId: string) => {
  return useFetcher({ key: `${lectureId}-${slideId}` });
};

function SlideContentManager({
  slideId,
  lectureId,
  slideNumber,
  content,
  generateStatus,
}: SlideContentManagerProps) {
  const [displayContent, setDisplayContent] = useState<string[]>(content || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [query, setQuery] = useState("");
  const fetcher = useSlideFetcher(lectureId, slideId);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayContent]);

  // SSE connection effect
  useEffect(() => {
    console.log("🔍 Debugging Lecture Slide Process:");
    console.log(`📜 Content:`, content);
    console.log(`🔄 Fetcher:`, fetcher);
    console.log(`⚡ Generate Status:`, generateStatus);
    console.log(`📚 Lecture ID:`, lectureId);
    console.log(`🖼️ Slide ID:`, slideId);
    console.log(`📑 Slide Number:`, slideNumber);
    console.log(`isStreaming`, isStreaming);
    console.log("✅ Process Complete.");
    console.log(isStreaming);
    let sse: EventSource | null = null;

    if (!generateStatus) {
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
        { numToQueue: 5, lectureId, slideNumber },
        {
          method: "post",
          action: queueSummariesRoute,
        }
      );
    } else {
      setDisplayContent(["Generation Failed"]);
    }

    return () => {
      if (sse) {
        console.log("Closing SSE connection");
        sse.close();
      }
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!query.trim()) return;

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

    setQuery("");
  };

  return (
    <div className="h-full flex flex-col relative">
      <div ref={contentRef} className="flex-1 overflow-y-auto pb-20">
        {displayContent && displayContent.length > 0 ? (
          displayContent.map((content, index) => (
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
        <fetcher.Form
          onSubmit={handleSubmit}
          className="flex items-center space-x-2"
        >
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
            disabled={fetcher.state === "submitting" || isStreaming}
          >
            {fetcher.state === "submitting" || isStreaming
              ? "Waiting..."
              : "Ask"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

export default function SlidePage() {
  const {
    imageData,
    slideId,
    slideNumber,
    numSlides,
    generateStatus,
    content,
  } = useLoaderData<typeof loader>();
  const { lectureId } = useParams();

  return (
    <div className="h-screen p-6 flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center overflow-hidden">
        <div className="w-full md:w-1/2 flex items-center">
          <img
            src={`data:image/png;base64, ${imageData}`}
            alt={`Slide ${slideNumber}`}
            className="w-full h-auto rounded-lg"
          />
        </div>

        <div className="w-full md:w-1/2 h-full flex flex-col">
          <div className="flex-1 bg-gray-50 rounded-lg overflow-y-auto">
            {/* Key prop here forces remount of the component that manages state */}
            <SlideContentManager
              key={`${slideId}-${lectureId}`}
              slideId={slideId}
              lectureId={lectureId!}
              slideNumber={slideNumber}
              content={content || []}
              generateStatus={generateStatus}
            />
          </div>
        </div>
      </div>

      <div className="flex mt-6">
        <div className="w-1/2 flex items-center justify-center">
          <p className="text-lg font-medium">
            Slide {slideNumber} of {numSlides}
          </p>
        </div>
        <div className="w-1/2 flex items-center justify-center space-x-4">
          {slideNumber > 1 && (
            <Link to={slideFromLectureRoute(lectureId!, slideNumber - 1)}>
              <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Previous
              </button>
            </Link>
          )}
          {slideNumber < numSlides && (
            <Link to={slideFromLectureRoute(lectureId!, slideNumber + 1)}>
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
