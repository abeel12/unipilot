import "server-only";

/** Server-only OpenAI key. Missing or placeholder values stay unset. */
export function openaiApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || /your-openai|sk-your/i.test(key)) return undefined;
  return key;
}
