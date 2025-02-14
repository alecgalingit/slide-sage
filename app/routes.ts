import type { Lecture, Slide } from "@prisma/client";

export const authenticatedRoute = "/authenticated";
export const submitRoute = `${authenticatedRoute}/submit`;

export const defaultRoute = submitRoute;

export const lectureRoute = (lectureId: Lecture["id"]) =>
  `${authenticatedRoute}/${lectureId}`;

export const slideFromLectureRoute = (
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) => `${lectureRoute(lectureId)}/slides/${slideNumber}`;
