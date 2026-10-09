/**
 * Speech in (browser speech recognition) and speech out (Polly through
 * /api/speak, falling back to the browser's voice). (R10.3, R10.10)
 */

/** Common mishearings of the name, mapped back to it (R10.10). */
const NAME_VARIANTS = "trivia|trevi|trivy|trivee|trivi|treavy|tree ?vee|tribe ?ee";
const MISHEARINGS = [
  // "Hey trivia", "hey Trevi" anywhere.
  new RegExp(`\\b(hey|hay)[\\s,-]+(${NAME_VARIANTS})\\b`, "gi"),
  // "A trivi", "hate trivia" only at the start (after an optional "Alexa"), so
  // "ask us a trivia question" stays as it is.
  new RegExp(`^(\\s*(?:alexa[\\s,]+)?)(a|hate|eight|they)[\\s,-]+(${NAME_VARIANTS})\\b`, "i"),
];

export function fixName(text: string): string {
  let out = text;
  out = out.replace(MISHEARINGS[0]!, "Hey Trivi");
  out = out.replace(MISHEARINGS[1]!, (_m, lead: string) => `${lead}Hey Trivi`);
  return out;
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

export function speechRecognitionAvailable(): boolean {
  return typeof window !== "undefined" && !!((window as never as Record<string, unknown>).SpeechRecognition ?? (window as never as Record<string, unknown>).webkitSpeechRecognition);
}

/**
 * Listen for one utterance. Resolves with the final transcript (name fixed),
 * or an empty string if nothing was heard.
 */
export function listenOnce(onInterim: (text: string) => void): { done: Promise<string>; stop: () => void } {
  const w = window as never as Record<string, new () => Recognition>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  const rec = new Ctor!();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";
  const done = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0]!.transcript;
        else interim += r[0]!.transcript;
      }
      onInterim(fixName(finalText + interim));
    };
    rec.onerror = (e) => (e.error === "no-speech" || e.error === "aborted" ? resolve("") : reject(new Error(e.error)));
    rec.onend = () => resolve(fixName(finalText.trim()));
  });
  rec.start();
  return { done, stop: () => rec.stop() };
}

let currentAudio: HTMLAudioElement | null = null;

/** Speak text. Resolves when speech ends. */
export async function speak(text: string, opts: { usePolly: boolean }): Promise<void> {
  stopSpeaking();
  if (!text.trim()) return;
  if (opts.usePolly) {
    try {
      const res = await fetch("/api/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (res.ok && res.headers.get("content-type")?.startsWith("audio/")) {
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        currentAudio = audio;
        await new Promise<void>((resolve) => {
          audio.onended = audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fall through to the browser voice.
    }
  }
  if (typeof speechSynthesis === "undefined") return;
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  currentAudio?.pause();
  currentAudio = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
