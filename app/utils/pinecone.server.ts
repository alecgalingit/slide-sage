import { singleton } from "~/singleton.server";
import { Pinecone } from "@pinecone-database/pinecone";
import type { Slide } from "~/models/lecture.server";
import { createEmbedding } from "./openai.server";

const loadPineconeIndex = (
  apiKey: string | undefined,
  indexName: string | undefined
) => {
  if (!apiKey) {
    throw new Error("Pinecone API key missing");
  }

  if (!indexName) {
    throw new Error("Pinecone index name missing");
  }

  const client = new Pinecone({ apiKey });
  return client.Index(indexName);
};

export const pineconeIndex = singleton("pinecone_index", () =>
  loadPineconeIndex(
    process.env["PINECONE_API_KEY"],
    process.env["PINECONE_INDEX"]
  )
);

export const embedAndUpsert = async (
  text: string,
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) => {
  try {
    const embedding = await createEmbedding(text);
    await pineconeIndex.upsert([
      {
        id: `${lectureId}_${slideNumber}`,
        values: embedding,
        metadata: {
          lectureId,
          slideNumber,
        },
      },
    ]);
  } catch (error) {
    console.error("Failed to create embedding or upsert to Pinecone:", error);
    throw error;
  }
};
