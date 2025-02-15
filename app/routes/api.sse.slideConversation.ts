import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import OpenAI from "openai";
import {
  getBase64FromSlide,
  getSlideInfo,
  getContextSlides,
  appendSlideConversation,
} from "~/models/lecture.server";
import type { Slide } from "~/models/lecture.server";
import {
  openaiClient,
  buildQueryWithConversationContext,
} from "~/utils/openai.server";
import type { SendFunction } from "~/utils/sse.server";

class ResponseHandler {
  private completeResponse: string;
  private isClientConnected: boolean;
  private send: SendFunction;
  private slideId: Slide["id"];
  private query: string;

  constructor(slideId: Slide["id"], query: string, send: SendFunction) {
    this.completeResponse = "";
    this.isClientConnected = true;
    this.send = send;
    this.slideId = slideId;
    this.query = query;
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
    // only save to database if client does not leave page before streaming finishes
    if (this.isClientConnected) {
      try {
        await appendSlideConversation(
          this.slideId,
          this.query,
          this.completeResponse
        );
      } catch (error) {
        console.error("Failed to save to database:", error);
        throw error;
      }
    }
  }

  endStream() {
    this.send({
      event: "end",
      data: JSON.stringify({ message: "Stream complete" }),
    });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slideId = url.searchParams.get("slideId");
  const query = url.searchParams.get("query");

  if (!slideId) {
    throw new Error("No slideId provided");
  }

  if (!query) {
    throw new Error("No query provided");
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

  const contextSlides = await getContextSlides(
    slide["lectureId"],
    slide["slideNumber"]
  );

  const content = slide.content;

  const messages = buildQueryWithConversationContext({
    contextSlides,
    base64Encoding,
    content,
    query,
  });

  const stream = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
  });

  return eventStream(request.signal, function setup(send) {
    const handler = new ResponseHandler(slideId, query, send);

    // keep save to databse in spite of disconnected, since want content to show up if user comes back later after immediately leaving
    // stop streaming to client though when disconnected, which is handled in handlechuck above
    async function processStream() {
      try {
        for await (const chunk of stream) {
          handler.handleChunk(chunk);
        }
        await handler.saveToDatabase();
        handler.endStream();
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
