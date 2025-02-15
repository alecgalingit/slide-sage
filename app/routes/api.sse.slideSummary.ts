import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import OpenAI from "openai";
import {
  updateSlideSummary,
  updateSlideGenerateStatus,
  StatusEnum,
  getBase64FromSlide,
  getContextSlides,
  getSlideInfo,
  updateLectureTitle,
} from "~/models/lecture.server";
import {
  openaiClient,
  buildSummaryQuery,
  inferSlideTitle,
} from "~/utils/openai.server";
import type { Slide, Lecture } from "~/models/lecture.server";
import type { SendFunction } from "~/utils/sse.server";
import { queueSummaries } from "~/utils/queueSummaries.server";

class ResponseHandler {
  private completeResponse: string;
  private isClientConnected: boolean;
  private send: SendFunction;
  private slideId: Slide["id"];

  constructor(
    slideId: Slide["id"],
    lectureId: Lecture["id"],
    slideNumber: Slide["slideNumber"],
    send: SendFunction
  ) {
    this.completeResponse = "";
    this.isClientConnected = true;
    this.send = send;
    this.slideId = slideId;
  }

  handleChunk(chunk: OpenAI.Chat.Completions.ChatCompletionChunk) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      this.completeResponse += content;
      if (this.isClientConnected) {
        // stringify is used to escape characters such as newlines that cause weird SSE behaviour; event.data is parsed in client with JSON.parse
        this.send({ data: JSON.stringify(content) });
        console.log("\n\n\n\n");
        console.log("-----------------");
        console.log("ADDING");
        console.log(JSON.stringify(content));
        console.log("-----------------");
        console.log("completeResponse is now");
        console.log(JSON.stringify(this.completeResponse));
        console.log("-----------------");
        console.log("\n\n\n\n");
      }
    }
  }

  setClientDisconnected() {
    this.isClientConnected = false;
  }

  async saveToDatabase() {
    try {
      await updateSlideSummary({
        identifier: { id: this.slideId },
        summary: this.completeResponse,
      });
      await updateSlideGenerateStatus({
        identifier: { id: this.slideId },
        status: StatusEnum.READY,
      });
    } catch (error) {
      console.error("Failed to save to database:", error);
      await updateSlideGenerateStatus({
        identifier: { id: this.slideId },
        status: StatusEnum.FAILED,
      });
      throw error;
    }
  }

  endStream() {
    this.send({
      event: "end",
      data: JSON.stringify({ message: "Stream complete" }),
    });
  }

  getCompleteResponse(): string {
    return this.completeResponse;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slideId = url.searchParams.get("slideId");

  if (!slideId) {
    throw new Error("No slideId provided");
  }

  const slide = await getSlideInfo(slideId);

  if (!slide) {
    throw new Error("Slide not found");
  }

  const base64Encoding = await getBase64FromSlide({ id: slideId });

  if (!base64Encoding) {
    // Return an error event stream if the encoding doesn't exist
    return eventStream(request.signal, function setup(send) {
      send({
        event: "error",
        data: JSON.stringify({
          message: "Image not found for this slide",
        }),
      });
      return function clear() {};
    });
  }

  const lectureId = slide["lectureId"];
  const slideNumber = slide["slideNumber"];

  const contextSlides = await getContextSlides(lectureId, slideNumber);

  const messages = buildSummaryQuery({ contextSlides, base64Encoding });

  const stream = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
  });

  return eventStream(request.signal, function setup(send) {
    const handler = new ResponseHandler(slideId, lectureId, slideNumber, send);

    // keep save to databse in spite of disconnected, since want content to show up if user comes back later after immediately leaving
    // stop streaming to client though when disconnected, which is handled in handlechuck above
    async function processStream() {
      try {
        for await (const chunk of stream) {
          handler.handleChunk(chunk);
        }
        await handler.saveToDatabase();
        if (slideNumber === 1) {
          const title = await inferSlideTitle({
            slideSummary: handler.getCompleteResponse(),
          });
          await updateLectureTitle({ lectureId, title });
        }
        handler.endStream();
        queueSummaries(5, lectureId, slideNumber);
      } catch (error) {
        console.error("Error processing stream:", error);
      }
    }

    processStream();

    return function clear() {
      handler.setClientDisconnected();
    };
  });
}
