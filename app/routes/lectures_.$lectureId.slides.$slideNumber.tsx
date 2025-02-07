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
import { RenderedMarkdown } from "~/components/markdownDisplayer";

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
  //   const tmp = `Lift $L$ can be determined by Lift Coefficient ($C_L$$) like the following
  // equation.

  // $$
  // L = \\frac{1}{2} \\rho v^2 S C_L
  // $$.
  // `;
  //   const tmp2 = `\\[M = (Q, \\Sigma, \\Gamma, \\vdash, u, \\delta, s, t, r)\\]`;

  useEffect(() => {
    let sse: EventSource | null = null;
    if (!generateStatus) {
      setDisplayContent("");
      sse = new EventSource(
        `/completion?slideId=${slideId}&lectureId=${lectureId}&slideNumber=${slideNumber}`
      );

      sse.addEventListener("message", (event) => {
        setDisplayContent(
          (prevResults) => prevResults + JSON.parse(event.data)
        );
        console.log("-----------------");
        console.log("ADDING");
        console.log(JSON.parse(event.data));
        console.log("-----------------");
      });

      sse.addEventListener("error", (event) => {
        console.log("error: ", event);
        if (sse) {
          sse.close();
        }
      });
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
  }, [content, slideId, lectureId, slideNumber, generateStatus, StatusOptions]);
  console.log("completeResponse is now");
  console.log(JSON.stringify(displayContent));
  console.log("-----------------");
  console.log("\n\n\n\n");
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
            <div className="p-6">
              {displayContent ? (
                <RenderedMarkdown source={displayContent} />
              ) : (
                <p className="text-gray-500">Loading slide content...</p>
              )}
            </div>
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
