import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import {
  getSlideFromLecture,
  getLectureById,
  StatusEnum,
} from "~/models/lecture.server";
import { slideFromLectureRoute } from "~/routes";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  //console.log("Request headers:", Object.fromEntries(request.headers));
  console.log("something happening in loader");
  const userId = await requireUserId(request);
  invariant(params.lectureId, "lectureId not found");
  invariant(params.slideNumber, "slideNumber not found");

  const lecture = await getLectureById(params.lectureId);
  if (!lecture) {
    throw new Response("Lecture not found", { status: 404 });
  }

  if (!lecture.numSlides) {
    throw new Response("Number of slides not found", { status: 404 });
  }

  const numSlides = lecture.numSlides;

  const slideNumber = Number(params.slideNumber);
  const slide = await getSlideFromLecture({
    lectureId: params.lectureId,
    slideNumber,
    userId,
  });

  if (!slide) {
    throw new Response("Slide not Found", { status: 404 });
  }
  console.log(`FOUND SLIDE!!!!!`);
  console.log(slide);
  console.log("Success!");
  return json({
    imageData: slide.base64,
    slideId: slide.id,
    slideNumber,
    numSlides,
    generateStatus: slide.generateStatus,
    content: slide.summary,
    StatusOptions: StatusEnum, // loaded since StatusEnum is defined in a server only script, and client uses below
  });
};

export default function SlidePage() {
  const {
    imageData,
    slideId,
    slideNumber,
    numSlides,
    generateStatus,
    content,
    StatusOptions,
  } = useLoaderData<typeof loader>();
  const { lectureId } = useParams();
  const [displayContent, setDisplayContent] = useState<string>(content || "");

  useEffect(() => {
    console.log("something happening");
    let sse: EventSource | null = null;
    console.log(`Generate status is ${generateStatus}`);
    if (!generateStatus) {
      setDisplayContent("");
      sse = new EventSource(`/completion?slideId=${slideId}`);

      sse.addEventListener("message", (event) => {
        setDisplayContent((prevResults) => prevResults + event.data);
      });

      sse.addEventListener("error", (event) => {
        console.log("error: ", event);
        if (sse) {
          sse.close();
        }
      });
    } else if (generateStatus === StatusOptions.PROCESSING) {
      setDisplayContent("Processing...");
    } else if (generateStatus === StatusOptions.READY) {
      if (content) {
        setDisplayContent(content);
      } else {
        setDisplayContent("Generation Failed");
      }
    } else {
      setDisplayContent("Generation Failed");
    }

    return () => {
      if (sse) {
        console.log("Closing SSE connection");
        sse.close();
      }
    };
  }, [content, generateStatus, slideId, StatusOptions]);

  return (
    <div className="h-screen p-6 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center overflow-hidden">
        {/* Image - centered */}
        <div className="w-full md:w-1/2 flex items-center">
          <img
            src={`data:image/png;base64, ${imageData}`}
            alt={`Slide ${slideNumber}`}
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Content - grows from top, scrolls when needed */}
        <div className="w-full md:w-1/2 h-full flex flex-col">
          <div className="flex-1 bg-gray-50 rounded-lg overflow-y-auto">
            <div className="p-6">
              {displayContent ? (
                <Markdown>{displayContent}</Markdown>
              ) : (
                <p className="text-gray-500">Loading slide content...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - stays at bottom */}
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
