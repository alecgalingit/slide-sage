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
import { embedAndUpsert } from "~/utils/pinecone.server";

class ResponseHandler {
  private completeResponse: string;
  private isClientConnected: boolean;
  private send: SendFunction;
  private slideId: Slide["id"];
  private lectureId: Slide["lectureId"];
  private slideNumber: Slide["slideNumber"];

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
    this.lectureId = lectureId;
    this.slideNumber = slideNumber;
  }

  handleChunk(chunk: OpenAI.Chat.Completions.ChatCompletionChunk) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      this.completeResponse += content;
      if (this.isClientConnected) {
        // stringify is used to escape characters such as newlines that cause weird SSE behaviour; event.data is parsed in client with JSON.parse
        this.send({ data: JSON.stringify(content) });
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
      await embedAndUpsert(
        this.completeResponse,
        this.lectureId,
        this.slideNumber
      );
    } catch (error) {
      console.error("Failed to save to database:", error);
      await updateSlideGenerateStatus({
        identifier: { id: this.slideId },
        status: StatusEnum.FAILED,
      });
      throw error;
    }
  }

  sendError(errorMessage: string) {
    this.send({
      event: "error",
      data: JSON.stringify({ message: errorMessage }),
    });
  }

  endStream() {
    if (this.isClientConnected) {
      this.send({
        event: "end",
        data: JSON.stringify({ message: "Stream complete" }),
      });
    }
  }

  getCompleteResponse(): string {
    return this.completeResponse;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slideId = url.searchParams.get("slideId");
  console.log("HERE1");
  if (!slideId) {
    throw new Error("No slideId provided");
  }
  console.log("HERE2");
  const slide = await getSlideInfo(slideId);
  console.log("HERE3");
  if (!slide) {
    throw new Error("Slide not found");
  }
  console.log("HERE4");
  await updateSlideGenerateStatus({
    identifier: { id: slideId },
    status: StatusEnum.PROCESSING,
  });
  console.log("HERE5");
  const base64Encoding = await getBase64FromSlide({ id: slideId });
  console.log("HERE6");
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
  console.log("HERE7");
  const lectureId = slide["lectureId"];
  const slideNumber = slide["slideNumber"];
  console.log("HERE8");
  const contextSlides = await getContextSlides(lectureId, slideNumber);
  console.log("HERE9");
  const messages = buildSummaryQuery({ contextSlides, base64Encoding });
  console.log("HERE10");
  return eventStream(request.signal, function setup(send) {
    const handler = new ResponseHandler(slideId, lectureId, slideNumber, send);
    // keep save to databse in spite of disconnected, since want content to show up if user comes back later after immediately leaving
    // stop streaming to client though when disconnected, which is handled in handlechuck above
    async function processStream() {
      try {
        const stream = await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          stream: true,
        });
        console.log("made it here");
        for await (const chunk of stream) {
          console.log("a chunk");
          handler.handleChunk(chunk);
        }
        handler.endStream();
      } catch (error) {
        console.error("Error processing stream:", error);
        handler.sendError(
          "We're receiving a high volume of requests at the moment and are hitting OpenAI rate limits. Please try again later."
        );
      }
      await handler.saveToDatabase();
      if (slideNumber === 1) {
        const title = await inferSlideTitle({
          slideSummary: handler.getCompleteResponse(),
        });
        await updateLectureTitle({ lectureId, title });
      }
      await queueSummaries(lectureId, slideNumber);
    }

    processStream();

    return function clear() {
      handler.setClientDisconnected();
    };
  });
}
