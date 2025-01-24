import { Form, useActionData, useFetcher } from "@remix-run/react";
import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createLecture } from "~/models/lecture.server";
import { requireUserId } from "~/session.server";
import { queue } from "~/queues/extractor.server";

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
  const pdfFile = formData.get("pdf");

  if (!pdfFile || !(pdfFile instanceof File)) {
    return json({ message: "No valid PDF file provided" }, { status: 400 });
  }

  const lecture = await createLecture(
    userId,
    "Uploaded Lecture",
    "Automatically created after PDF upload"
  );

  const arrayBuffer = await pdfFile.arrayBuffer();
  const base64pdf = Buffer.from(arrayBuffer).toString("base64");

  queue.add("Extract images from slide and upload to cloud", {
    lectureId: lecture.id,
    userId: userId,
    pdfBuffer: base64pdf,
  });

  return json({ message: "Succeeded with adding to queue" });
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
          id="pdf"
          name="pdf"
          accept=".pdf"
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
      <Form action="/logout" method="post">
        <button
          type="submit"
          className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
        >
          Logout
        </button>
      </Form>
    </div>
  );
}
