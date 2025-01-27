import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import OpenAI from "openai";
import { singleton } from "~/singleton.server";
import {
  updateSlideSummary,
  updateSlideGenerateStatus,
  StatusEnum,
  getBase64FromSlide,
} from "~/models/lecture.server";
import type { Slide } from "~/models/lecture.server";

const openai = singleton(
  "openai_client",
  () =>
    new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    })
);

//Remix utils does not export these types that I use in ResponseHandler class, so had to manually define
interface SendFunctionArgs {
  event?: string;
  data: string;
}
type SendFunction = (args: SendFunctionArgs) => void;
//

class ResponseHandler {
  private completeResponse: string;
  private isClientConnected: boolean;
  private send: SendFunction;
  private slideId: Slide["id"];

  constructor(slideId: Slide["id"], send: SendFunction) {
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
        this.send({ data: content });
      }
    }
  }

  setClientDisconnected() {
    this.isClientConnected = false;
  }

  async saveToDatabase() {
    try {
      updateSlideSummary(this.slideId, this.completeResponse);
    } catch (error) {
      console.error("Failed to save to database:", error);
      updateSlideGenerateStatus(this.slideId, StatusEnum.FAILED);
    }
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const slideId = new URL(request.url).searchParams.get("slideId");
  if (!slideId) {
    throw new Error("No slideId provided");
  }
  const base64Encoding = await getBase64FromSlide(slideId);

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

  const messages: OpenAI.Chat.ChatCompletionUserMessageParam[] = [
    {
      role: "user",
      content: [
        { type: "text", text: "Analyze this image:" },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${base64Encoding}`,
          },
        },
      ],
    },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
  });

  return eventStream(request.signal, function setup(send) {
    const handler = new ResponseHandler(slideId, send);

    async function processStream() {
      try {
        for await (const chunk of stream) {
          handler.handleChunk(chunk);
        }
        await handler.saveToDatabase();
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
