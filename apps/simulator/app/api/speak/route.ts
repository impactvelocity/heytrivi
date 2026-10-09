/**
 * Speech out through Amazon Polly (R10.3). Returns MP3 audio. If Polly isn't
 * available, returns 204 and the browser uses its own voice instead.
 */

import { PollyClient, SynthesizeSpeechCommand, type Engine, type VoiceId } from "@aws-sdk/client-polly";

export const dynamic = "force-dynamic";

const polly = new PollyClient({ region: process.env.POLLY_REGION ?? process.env.AWS_REGION ?? "us-east-2" });

export async function POST(req: Request) {
  if (process.env.MOCK_MODEL === "1" && process.env.POLLY_IN_MOCK !== "1") return new Response(null, { status: 204 });
  const { text } = (await req.json()) as { text: string };
  try {
    const out = await polly.send(
      new SynthesizeSpeechCommand({
        Text: text.slice(0, 1500),
        OutputFormat: "mp3",
        VoiceId: (process.env.POLLY_VOICE_ID ?? "Joanna") as VoiceId,
        // us-east-2 offers only the standard engine. See docs/decisions.md.
        Engine: (process.env.POLLY_ENGINE ?? "standard") as Engine,
      }),
    );
    const bytes = await out.AudioStream!.transformToByteArray();
    return new Response(Buffer.from(bytes), { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (err) {
    console.error("polly error", (err as Error).name, (err as Error).message);
    return new Response(null, { status: 204 });
  }
}
