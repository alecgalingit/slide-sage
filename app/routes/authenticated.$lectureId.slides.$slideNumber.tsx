import type React from "react";

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
  summaryErrorMessage: string | null;
  conversationErrorMessage: string | null;
  showSummaryErrorModal: boolean;
  showConversationErrorModal: boolean;
  dismissSummaryError: () => void;
  dismissConversationError: () => void;
}

function SummaryDisplayer({
  content,
  onSubmitQuery,
  isStreaming,
  summaryErrorMessage,
  conversationErrorMessage,
  showSummaryErrorModal,
  showConversationErrorModal,
  dismissSummaryError,
  dismissConversationError,
}: SummaryDisplayerProps) {
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim() || summaryErrorMessage) return;

    const currentQuery = query;
    onSubmitQuery(currentQuery);

    // Don't clear the input if there's a conversation error
    if (!conversationErrorMessage) {
      setQuery("");
    }

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

  console.log(
    `isStreaming: ${isStreaming}, summaryErrorMessage: ${summaryErrorMessage !== null}, conversationErrorMessage: ${conversationErrorMessage !== null}`
  );

  return (
    <div className="h-full flex flex-col relative">
      {showSummaryErrorModal && summaryErrorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
              Summary Error
            </h3>
            <p className="mb-5 text-gray-700 dark:text-gray-300">
              {summaryErrorMessage}
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              onClick={dismissSummaryError}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showConversationErrorModal && conversationErrorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
              Error
            </h3>
            <p className="mb-5 text-gray-700 dark:text-gray-300">
              {conversationErrorMessage}
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              onClick={dismissConversationError}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pb-20 px-1 scroll-smooth"
      >
        {content && content.length > 0 ? (
          content.map((content, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg my-2 ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-gray-800/50"
                  : index % 4 === 1
                    ? "bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20"
                    : "bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800"
              }`}
            >
              <RenderedMarkdown source={content} />
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="animate-pulse mb-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-2"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto"></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading slide content...
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Ask a question about this slide..."
            disabled={summaryErrorMessage !== null && content.length <= 1}
          />
          <button
            type="submit"
            className="px-5 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            disabled={
              isStreaming ||
              (summaryErrorMessage !== null && content.length <= 1)
            }
          >
            {isStreaming
              ? "Waiting..."
              : summaryErrorMessage !== null && content.length <= 1
                ? "Unavailable"
                : "Ask"}
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
  const [summaryErrorMessage, setSummaryErrorMessage] = useState<string | null>(
    null
  );
  const [conversationErrorMessage, setConversationErrorMessage] = useState<
    string | null
  >(null);
  const [showSummaryErrorModal, setShowSummaryErrorModal] =
    useState<boolean>(false);
  const [showConversationErrorModal, setShowConversationErrorModal] =
    useState<boolean>(false);
  const fetcher = useSlideFetcher(lectureId, slideId);
  const dismissSummaryError = () => setShowSummaryErrorModal(false);
  const dismissConversationError = () => setShowConversationErrorModal(false);

  useEffect(() => {
    let sse: EventSource | null = null;

    if (!generateStatus || generateStatus === StatusEnum.PROCESSING) {
      setDisplayContent([]);
      setIsStreaming(true);
      setSummaryErrorMessage(null);

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

      sse.addEventListener("error", (event) => {
        if (sse) {
          sse.close();
        }
        setIsStreaming(false);

        try {
          const errorData = JSON.parse((event as MessageEvent).data);
          setSummaryErrorMessage(errorData.message || "Unknown error occurred");
          setShowSummaryErrorModal(true);
          setDisplayContent([
            "Summary generation failed. Please refresh and try again.",
          ]);
        } catch (error) {
          setSummaryErrorMessage(
            "Error generating slide summary. Please refresh and try again."
          );
          setShowSummaryErrorModal(true);
          setDisplayContent([
            "Summary generation failed. Please refresh and try again.",
          ]);
        }
      });

      sse.addEventListener("end", () => {
        setIsStreaming(false);
        if (sse) {
          sse.close();
        }
      });
    } else if (generateStatus === StatusEnum.READY) {
      setDisplayContent(content);
      setSummaryErrorMessage(null);
      fetcher.submit(
        { lectureId, slideNumber },
        {
          method: "post",
          action: queueSummariesRoute,
        }
      );
    } else {
      setSummaryErrorMessage(
        "Generation failed. Please refresh and try again."
      );
      setShowSummaryErrorModal(true);
      setDisplayContent([
        "Summary generation failed. Please refresh and try again.",
      ]);
    }

    return () => {
      if (sse) {
        sse.close();
      }
    };
  }, []);

  const handleQuerySubmit = (query: string) => {
    if (summaryErrorMessage !== null) return;

    setConversationErrorMessage(null);

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

    sse.addEventListener("error", (event) => {
      sse.close();
      setIsStreaming(false);

      try {
        const errorData = JSON.parse((event as MessageEvent).data);
        const errorMsg =
          errorData.message ||
          "Error processing your question. Please try again.";

        setConversationErrorMessage(errorMsg);
        setShowConversationErrorModal(true);
      } catch (error) {
        setConversationErrorMessage(
          "Error processing your question. Please try again."
        );
        setShowConversationErrorModal(true);

        setDisplayContent((prev) => {
          const updatedContent = [...prev];
          if (updatedContent.length >= 2) {
            updatedContent[updatedContent.length - 1] =
              "*Error processing your question. Please try again.*";
          }
          return updatedContent;
        });
      }
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
      summaryErrorMessage={summaryErrorMessage}
      conversationErrorMessage={conversationErrorMessage}
      showSummaryErrorModal={showSummaryErrorModal}
      showConversationErrorModal={showConversationErrorModal}
      dismissSummaryError={dismissSummaryError}
      dismissConversationError={dismissConversationError}
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
    <div className="w-full h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
        <div className="w-full md:w-1/2 flex items-start">
          <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-800">
            <img
              src={`data:image/png;base64, ${imageData}`}
              alt={`Slide ${slideNumber}`}
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col min-h-0">
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
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

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Slide <span className="font-bold">{slideNumber}</span> of{" "}
          <span className="font-bold">{numSlides}</span>
        </p>
        <div className="flex items-center space-x-4">
          {slideNumber > 1 && (
            <Link
              to={{
                pathname: slideFromLectureRoute(lectureId, slideNumber - 1),
                search: location.search,
              }}
            >
              <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-left"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
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
              <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary flex items-center gap-2">
                Next
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-right"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
