import { Form, useActionData, useFetcher } from "@remix-run/react";
import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
  redirect,
} from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createLecture } from "~/models/lecture.server";
import { requireUserId } from "~/session.server";
//import { queue } from "~/queues/extractorqueue.server";
import { slideFromLectureRoute } from "~/routes";
import { extractLecture } from "~/utils/extractor.server";
import { convertPptToPdf } from "~/utils/converter.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  return json({ userId });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 10_000_000,
  }); // 10 MB max

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const file = formData.get("presentation");

  if (!file || !(file instanceof File)) {
    return json({ message: "No valid file provided" }, { status: 400 });
  }

  const lecture = await createLecture(
    userId,
    "Uploaded Lecture",
    "Automatically created after file upload"
  );

  try {
    let pdfBuffer: Buffer;

    // Check file extension to determine if conversion is needed
    const fileExtension = file.name.toLowerCase().split(".").pop();

    if (fileExtension === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } else if (["ppt", "pptx"].includes(fileExtension || "")) {
      pdfBuffer = await convertPptToPdf(file);
    } else {
      return json(
        {
          message:
            "Unsupported file format. Please upload PDF or PowerPoint files.",
        },
        { status: 400 }
      );
    }

    const base64pdf = pdfBuffer.toString("base64");
    await extractLecture({
      lectureId: lecture.id,
      userId,
      pdfBuffer: base64pdf,
    });

    return redirect(slideFromLectureRoute(lecture.id, 1));
  } catch (error) {
    console.error("Error processing file:", error);
    return json(
      { message: "Failed to process the uploaded file" },
      { status: 500 }
    );
  }
};

export default function PDFUploadPage() {
  const actionMessage = useActionData<typeof action>();
  const fetcher = useFetcher();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Form method="post" encType="multipart/form-data" className="mb-4">
        <label htmlFor="pdf" className="block mb-2">
          Upload PDF Presentation
        </label>
        <input
          type="file"
          id="presentation"
          name="presentation"
          accept=".pdf,.ppt,.pptx"
          className="border p-2 w-full mb-4"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          disabled={fetcher.state === "submitting"}
        >
          {fetcher.state === "submitting" ? "Uploading..." : "Upload PDF"}
        </button>
      </Form>
      {actionMessage ? (
        <p>
          <b>{actionMessage.message}</b>
        </p>
      ) : null}
    </div>
  );
}
