import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { queueSummaries } from "~/utils/queueSummaries.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const numToQueue = Number(formData.get("numToQueue"));
    const lectureId = formData.get("lectureId")?.toString();
    const slideNumber = Number(formData.get("slideNumber"));

    if (isNaN(numToQueue) || !lectureId || isNaN(slideNumber)) {
      return json({ error: "Invalid input" }, { status: 400 });
    }

    console.log("HEREE_1");
    await queueSummaries(numToQueue, lectureId, slideNumber);
    console.log("HEREE_2");

    return json({ message: "Slide summaries queued successfully" });
  } catch (error) {
    return json({ error: "Failed to queue summaries" }, { status: 500 });
  }
};
