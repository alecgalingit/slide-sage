import { requireUserId } from "~/session.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getLectureById, getAllSlideBase64s } from "~/models/lecture.server";
import SlideNavigator from "./slideNavigator";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.lectureId, "lectureId not found");

  const lecture = await getLectureById(params.lectureId);

  if (!lecture || userId !== lecture.userId) {
    throw new Response("Lecture not found", { status: 404 });
  }

  if (!lecture.numSlides) {
    throw new Response("Number of slides not found", { status: 404 });
  }

  const slides = await getAllSlideBase64s(lecture.id);

  return json({
    numSlides: lecture.numSlides,
    lectureId: lecture.id,
    slides,
  });
};

export default function LectureSlidesLayout() {
  const { numSlides, lectureId, slides } = useLoaderData<typeof loader>();
  const params = useParams();
  const currentSlideNumber = params.slideNumber
    ? parseInt(params.slideNumber)
    : 1;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <SlideNavigator
          lectureId={lectureId}
          slides={slides}
          currentSlideNumber={currentSlideNumber}
        />

        <div className="flex-1 overflow-auto">
          <Outlet context={{ numSlides, lectureId }} />
        </div>
      </div>
    </div>
  );
}
