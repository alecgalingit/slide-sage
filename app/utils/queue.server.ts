import type { Processor } from "bullmq";
import { Queue as BullQueue, Worker } from "bullmq";

import { redis } from "./redis.server";

type RegisteredQueue = {
  queue: BullQueue;
  worker: Worker;
};

declare global {
  let __registeredQueues: Record<string, RegisteredQueue> | undefined;
}

const g = global as unknown as {
  __registeredQueues: Record<string, RegisteredQueue>;
};

const registeredQueues = g.__registeredQueues || (g.__registeredQueues = {});

export function Queue<Payload>(
  name: string,
  handler: Processor<Payload>
): BullQueue<Payload> {
  if (registeredQueues[name]) {
    return registeredQueues[name].queue as BullQueue<Payload>;
  }

  const queue = new BullQueue<Payload>(name, { connection: redis });
  const worker = new Worker<Payload>(name, handler, { connection: redis });

  registeredQueues[name] = { queue, worker };

  return queue;
}
