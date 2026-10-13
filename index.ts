/**
 * Minimal Higgsfield API example: one Seedance 2.5 text-to-video generation.
 *
 * Credentials come from HF_CREDENTIALS ("key-id:key-secret") in .env.local, or
 * .env as a fallback — both git-ignored — loaded at runtime and never printed.
 * This makes a billable request.
 *
 * Run: npx tsx index.ts
 */
import { config as loadEnv } from "dotenv";
import { config, higgsfield, APIError, NotEnoughCreditsError, TimeoutError } from "@higgsfield/client/v2";

loadEnv({ path: [".env.local", ".env"], quiet: true });

if (!process.env.HF_CREDENTIALS) {
  console.error("HF_CREDENTIALS is not set. Add it to .env.local (or .env) as key-id:key-secret.");
  process.exit(1);
}

config({
  credentials: process.env.HF_CREDENTIALS,
  // Video takes minutes; the SDK's default polling gives up after five.
  pollInterval: 5000,
  maxPollTime: 20 * 60 * 1000,
});

async function main(): Promise<void> {
  const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
      output_format: "mp4",
      generate_audio: true,
    },
    withPolling: true,
  });

  // v2 returns { status, request_id, video?: { url } }. Anything other than a
  // completed request with a URL is a failure — including "nsfw" (moderated)
  // and "failed". A cancelled request never reaches a terminal status the SDK
  // polls for, so it surfaces as a TimeoutError below.
  if (result.status !== "completed") {
    const why = result.status === "nsfw" ? "moderated (flagged as NSFW)" : result.status;
    throw new Error(`Generation did not complete: ${why} (request ${result.request_id}).`);
  }
  const url = result.video?.url;
  if (!url) throw new Error(`Request ${result.request_id} completed without a video URL.`);

  console.log(url);
}

main().catch((err: unknown) => {
  if (err instanceof NotEnoughCreditsError) console.error("Not enough Higgsfield API credits for this generation.");
  else if (err instanceof TimeoutError) console.error(`Timed out waiting for the video (cancelled or stuck): ${err.message}`);
  else if (err instanceof APIError) console.error(`Higgsfield API error ${err.statusCode ?? ""}: ${err.message}`);
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
