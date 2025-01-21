import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getSlideFromLecture, getLectureById } from "~/models/lecture.server";
import { slideFromLectureRoute } from "~/routes";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  console.log("Request headers:", Object.fromEntries(request.headers));
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
  const base64String = slide.base64;
  console.log("Success!");
  return json({ imageData: base64String, slideNumber, numSlides });
};

export default function SlidePage() {
  const { imageData, slideNumber, numSlides } = useLoaderData<typeof loader>();
  const { lectureId } = useParams();

  return (
    <div>
      <h1>Slide!</h1>
      <img
        src={`data:image/png;base64, ${imageData}`}
        alt={`Slide ${slideNumber}`}
      />
      <div style={{ marginTop: "20px" }}>
        {/* Slide progress display */}
        <p
          style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}
        >
          Slide {slideNumber} of {numSlides}
        </p>
        <div>
          {slideNumber > 1 && (
            <Link to={slideFromLectureRoute(lectureId!, slideNumber - 1)}>
              <button>Previous</button>
            </Link>
          )}

          {slideNumber < numSlides && (
            <Link to={slideFromLectureRoute(lectureId!, slideNumber + 1)}>
              <button>Next</button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
