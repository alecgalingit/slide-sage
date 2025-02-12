import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getSlideFromLecture, getLectureById } from "~/models/lecture.server";
import { slideFromLectureRoute } from "~/routes";
import { useEffect, useState } from "react";
import { RenderedMarkdown } from "~/components/markdownDisplayer";
import type { Slide, Lecture } from "~/models/lecture.server";
import { StatusEnum, StatusType } from "~/status";

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

function SlideContentManager({
  slideId,
  lectureId,
  slideNumber,
  content,
  generateStatus,
}: SlideContentManagerProps) {
  const [displayContent, setDisplayContent] = useState<string[]>(content || []);

  useEffect(() => {
    let sse: EventSource | null = null;

    if (!generateStatus) {
      setDisplayContent([]);
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
      });
    } else if (generateStatus === StatusEnum.READY) {
      if (content) {
        setDisplayContent(content);
      } else {
        setDisplayContent(["Generation Failed"]);
      }
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

  return (
    <div className="p-6">
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
        <p>Loading slide content...</p>
      )}
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
