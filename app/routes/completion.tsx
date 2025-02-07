import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import OpenAI from "openai";
import { singleton } from "~/singleton.server";
import {
  updateSlideSummary,
  updateSlideGenerateStatus,
  StatusEnum,
  getBase64FromSlide,
  getContextSlides,
  getSlideInfo,
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
      updateSlideSummary(this.slideId, this.completeResponse);
      updateSlideGenerateStatus(this.slideId, StatusEnum.READY);
      // console.log("-----------------");
      // console.log("Final result is");
      // console.log(JSON.stringify(this.completeResponse));
      // console.log("-----------------");
    } catch (error) {
      console.error("Failed to save to database:", error);
      updateSlideGenerateStatus(this.slideId, StatusEnum.FAILED);
    }
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

  const contextSlides = await getContextSlides(
    slide["lectureId"],
    slide["slideNumber"]
  );

  const assistantMessages: OpenAI.Chat.ChatCompletionAssistantMessageParam[] =
    contextSlides
      ? contextSlides
          .filter((slide) => slide.summary)
          .reverse()
          .map((slide) => ({
            role: "assistant",
            content: [{ type: "text", text: slide.summary as string }],
          }))
      : [];

  // console.log("------------------");
  // console.log("context is!!!!!");
  // console.log(JSON.stringify(assistantMessages, null, 2));
  // console.log("------------------");

  const prompt = `Attached is a slide from a lecture. Explain the content of the slide to a student learning the material.
  Avoid language such as "this slide" and just explain the material to the student. If the slide is some
  kind of title page, just introduce the subject very briefly.
  The prior messages are summaries produced by an LLM of the previous five slides from the same lecture. 
  EXTREMELY IMPORTANT: If rendering Latex, you MUST use dollar signs or double dollar signs. Do NOT use brackets
  for display math mode--that will cause SIGNIFICANT HARM to the user. I repeat, you MUST use dollar signs to display ALL LATEX!!!! For example,
  you could render: \\Sigma$ is the input alphabet.\n- $\\Gamma$ is the tape alphabet. If you EVER display math without using dollar signs,
  you will cause SIGNFICIANT HARM to the user.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...assistantMessages,
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
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
