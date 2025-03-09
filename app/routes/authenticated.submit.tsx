import type React from "react";

import { useActionData, useFetcher } from "@remix-run/react";
import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
  redirect,
} from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createLecture } from "~/models/lecture.server";
import { requireUserId } from "~/session.server";
import {
  slideFromLectureRoute,
  sideBarSearchKey,
  sideBarCollapsedValue,
} from "~/routes";
import { extractLecture } from "~/utils/extractor.server";
import { convertPptToPdf } from "~/utils/converter.server";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

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

    const redirectUrl = `${slideFromLectureRoute(lecture.id, 1)}?${sideBarSearchKey}=${sideBarCollapsedValue}`;
    return redirect(redirectUrl);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (isSubmitting) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isSubmitting]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      const form = document.getElementById("upload-form") as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      const input = document.getElementById(
        "presentation-file-input"
      ) as HTMLInputElement;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(e.dataTransfer.files[0]);
        input.files = dataTransfer.files;

        const form = document.getElementById("upload-form") as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-xl">
        {isSubmitting ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-center mb-8 text-gray-900 dark:text-gray-100">
              Processing Presentation
            </h2>

            <div className="flex flex-col items-center justify-center gap-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <Loader2 className="h-14 w-14 text-primary animate-spin relative z-10" />
              </div>

              <div className="text-center space-y-2 max-w-md mx-auto">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Analyzing your slides
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This may take a moment while we process your presentation
                </p>
              </div>

              <div className="w-full max-w-md mt-2">
                <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
                  {progress}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Lecture
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Upload a powerpoint or pdf file
              </p>
            </div>

            {actionMessage && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-800 dark:text-red-300 text-sm">
                  {actionMessage.message}
                </div>
              </div>
            )}

            <fetcher.Form
              id="upload-form"
              method="post"
              encType="multipart/form-data"
              className="flex-1 flex flex-col"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  className={`m-6 py-12 px-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-300 ${
                    isDragging
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="presentation-file-input"
                    name="presentation"
                    accept=".pdf,.ppt,.pptx"
                    className="sr-only"
                    onChange={handleFileChange}
                    required
                  />

                  {selectedFile ? (
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg w-full max-w-md">
                      <div className="mr-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="presentation-file-input"
                      className="cursor-pointer text-center"
                      aria-label="Upload presentation file"
                    >
                      <div className="flex flex-col items-center">
                        <div className="mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          <span className="text-primary">Select a file</span> or
                          drag and drop
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          PDF, PPT, or PPTX (max 10MB)
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {selectedFile && (
                  <div className="px-6 pb-6 flex justify-center">
                    <div className="animate-pulse flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  </div>
                )}
              </div>
            </fetcher.Form>
          </div>
        )}
      </div>
    </div>
  );
}
