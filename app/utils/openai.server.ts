import OpenAI from "openai";
import type { getContextSlides, Slide } from "~/models/lecture.server";
import { singleton } from "~/singleton.server";
import { z } from "zod";

export const openaiClient = singleton(
  "openai_client",
  () =>
    new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    })
);

const summaryPrompt = `Attached is a slide from a lecture. Explain the content of the slide to a student learning the material.
Avoid language such as "this slide" and just explain the material to the student. If the slide is some
kind of title page, just introduce the subject very briefly.
The prior messages are summaries produced by an LLM of up to the previous five slides from the same lecture. 
EXTREMELY IMPORTANT: If rendering Latex, you MUST use dollar signs or double dollar signs. Do NOT use brackets
for display math mode--that will cause SIGNIFICANT HARM to the user. I repeat, you MUST use dollar signs to display ALL LATEX!!!! For example,
you could render: \\Sigma$ is the input alphabet.\n- $\\Gamma$ is the tape alphabet. If you EVER display math without using dollar signs,
you will cause SIGNFICIANT HARM to the user.`;

const simplifiedSummaryPrompt = `Attached is a slide from a lecture. Explain the content of the slide to a student learning the material.
Avoid language such as "this slide" and just explain the material to the student`;

const DEFAULT_MODEL = "gpt-4o";

type ContextSlides = Awaited<ReturnType<typeof getContextSlides>>;

function buildSlideQuery(
  base64Encoding: Slide["base64"],
  summaryPrompt?: string
): OpenAI.Chat.ChatCompletionUserMessageParam {
  const content: Array<OpenAI.Chat.ChatCompletionContentPart> = [];

  // Only add system prompt if it's provided
  if (summaryPrompt) {
    content.push({
      type: "text",
      text: summaryPrompt,
    });
  }

  // Always add the image
  content.push({
    type: "image_url",
    image_url: {
      url: `data:image/png;base64,${base64Encoding}`,
    },
  });

  return {
    role: "user",
    content: content,
  };
}
function buildAssistantQuery(
  text: string
): OpenAI.Chat.ChatCompletionAssistantMessageParam {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
  };
}

export function buildSummaryQuery({
  contextSlides,
  base64Encoding,
}: {
  contextSlides?: ContextSlides;
  base64Encoding: Slide["base64"];
}): OpenAI.Chat.ChatCompletionMessageParam[] {
  const assistantMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
    contextSlides
      ? contextSlides
          .reverse()
          .flatMap((slide) => [
            buildSlideQuery(slide.base64),
            buildAssistantQuery(slide.summary),
          ])
      : [];
  const slideQuery = buildSlideQuery(base64Encoding, summaryPrompt);
  return [...assistantMessages, slideQuery];
}
export function buildQueryWithConversationContext({
  contextSlides,
  base64Encoding,
  content,
  query,
}: {
  contextSlides?: ContextSlides;
  base64Encoding: Slide["base64"];
  content: Slide["content"];
  query: string;
}): OpenAI.Chat.ChatCompletionMessageParam[] {
  const summaryQuery = buildSummaryQuery({ contextSlides, base64Encoding });

  if (!content || content.length === 0) {
    throw new Error("No existing summary or conversation for this slide.");
  }

  const conversationContext: OpenAI.Chat.ChatCompletionMessageParam[] =
    content.map((text, index) => ({
      role: index % 2 === 0 ? "assistant" : "user",
      content: [{ type: "text", text }],
    }));
  const queryPrompt = `Given the uploaded lecture slide and the summaries of the previous slides, respond to the following user query while considering the previous conversation: "${query}". Ensure your response is clear and directly addresses the user's question in the context of the lecture material.`;

  const queryMessage: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "user",
    content: [{ type: "text", text: queryPrompt }],
  };

  return [...summaryQuery, ...conversationContext, queryMessage];
}

export function buildQueryWithConversationContextEfficient({
  base64Encoding,
  content,
  query,
}: {
  base64Encoding: Slide["base64"];
  content: Slide["content"];
  query: string;
}): OpenAI.Chat.ChatCompletionMessageParam[] {
  const summaryQuery = buildSlideQuery(base64Encoding, simplifiedSummaryPrompt);
  if (!content || content.length === 0) {
    throw new Error("No existing summary or conversation for this slide.");
  }

  const conversationContext: OpenAI.Chat.ChatCompletionMessageParam[] =
    content.map((text, index) => ({
      role: index % 2 === 0 ? "assistant" : "user",
      content: [{ type: "text", text }],
    }));

  const queryPrompt = `Given the uploaded lecture slide and its AI generated summary, respond to the following user query: "${query}". Ensure your response is clear and directly addresses the user's question in the context of the lecture material.`;

  const queryMessage: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "user",
    content: [{ type: "text", text: queryPrompt }],
  };

  return [summaryQuery, ...conversationContext, queryMessage];
}

const titleResponseSchema = z.object({
  title: z.string().min(1),
});

async function attemptTitleGeneration({
  slideSummary,
  model,
  attempt,
}: {
  slideSummary: string;
  model: string;
  attempt: number;
}): Promise<string> {
  const titleSystemPrompt = `You are a helpful assistant that creates concise, descriptive titles for lecture slides.
Given a summary of a slide's content, create a brief, informative title that captures the main topic or concept.
The title should be:
- Between 2-6 words
- Properly capitalized
- Not include unnecessary words like "Introduction to" unless it's actually an introductory slide
- Focus on the key concept or topic
- Not end with punctuation

Return ONLY a JSON object with a single "title" field.
${attempt > 1 ? "\nPrevious attempts failed validation. Please ensure you follow the requirements exactly." : ""}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: titleSystemPrompt,
    },
    {
      role: "user",
      content: `Create a title for the following slide summary: "${slideSummary}"`,
    },
  ];

  const response = await openaiClient.chat.completions.create({
    messages,
    model,
    temperature: 0.3 + attempt * 0.1,
    max_tokens: 20,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content received from OpenAI API");
  }

  const parsed = JSON.parse(content);
  const validated = titleResponseSchema.parse(parsed);

  return validated.title.trim();
}

export async function inferSlideTitle({
  slideSummary,
  model = DEFAULT_MODEL,
}: {
  slideSummary: string;
  model?: string;
}): Promise<string> {
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `Attempting to generate title (attempt ${attempt}/${MAX_ATTEMPTS})`
      );
      const title = await attemptTitleGeneration({
        slideSummary,
        model,
        attempt,
      });
      return title;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
    }
  }
  throw new Error(
    `Failed to generate valid title after ${MAX_ATTEMPTS} attempts. Last error: ${lastError?.message}`
  );
}
