import type { Lecture, Slide } from "@prisma/client";

export const dashboardRoute = "/lectures";

export const lectureRoute = (lectureId: Lecture["id"]) =>
  `${dashboardRoute}/${lectureId}`;

export const slideFromLectureRoute = (
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) => `${lectureRoute(lectureId)}/slides/${slideNumber}`;
