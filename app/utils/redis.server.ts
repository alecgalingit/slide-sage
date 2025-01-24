import type { Redis as RedisType, RedisOptions } from "ioredis";
import Redis from "ioredis";

let redis: RedisType;

declare global {
  let __redis: RedisType | undefined;
}

const g = global as unknown as { __redis: RedisType | undefined };

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

if (process.env.NODE_ENV === "production") {
  redis = new Redis(process.env.REDIS_URL || "", redisOptions);
} else {
  if (!g.__redis) {
    g.__redis = new Redis(process.env.REDIS_URL || "", redisOptions);
  }
  redis = g.__redis;
}

export { redis };
