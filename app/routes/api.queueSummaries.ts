import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { queueSummaries } from "~/utils/queueSummaries.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const lectureId = formData.get("lectureId")?.toString();
    const slideNumber = Number(formData.get("slideNumber"));

    if (!lectureId || isNaN(slideNumber)) {
      return json({ error: "Invalid input" }, { status: 400 });
    }

    await queueSummaries(lectureId, slideNumber);

    return json({ message: "Slide summaries queued successfully" });
  } catch (error) {
    return json({ error: "Failed to queue summaries" }, { status: 500 });
  }
};
