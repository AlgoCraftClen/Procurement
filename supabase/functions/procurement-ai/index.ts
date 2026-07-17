import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvokeRequest = {
  prompt?: string;
  file_urls?: string[];
  response_json_schema?: Record<string, unknown>;
  add_context_from_internet?: boolean;
};

const DEFAULT_MODEL = "gpt-4o-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OPENAI_API_KEY is not configured for this Supabase Edge Function." }, 503);
  }

  let body: InvokeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON request body." }, 400);
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return jsonResponse({ error: "A prompt is required." }, 400);
  }

  const fileUrls = Array.isArray(body.file_urls) ? body.file_urls.filter(Boolean) : [];
  const schema = body.response_json_schema;
  const wantsJson = Boolean(schema && typeof schema === "object");

  const content = [
    {
      type: "input_text",
      text: buildPrompt(prompt, Boolean(body.add_context_from_internet), wantsJson),
    },
    ...fileUrls.map(toOpenAIContent),
  ];

  const responsePayload: Record<string, unknown> = {
    model: Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL,
    input: [
      {
        role: "user",
        content,
      },
    ],
    temperature: 0.1,
  };

  if (wantsJson) {
    responsePayload.text = {
      format: {
        type: "json_schema",
        name: "procurement_result",
        schema,
        strict: false,
      },
    };
  }

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(responsePayload),
  });

  const result = await openAIResponse.json();
  if (!openAIResponse.ok) {
    return jsonResponse(
      { error: result?.error?.message || "OpenAI request failed.", details: result?.error || null },
      openAIResponse.status,
    );
  }

  const outputText = extractOutputText(result);
  if (!wantsJson) {
    return jsonResponse({ result: outputText });
  }

  try {
    return jsonResponse({ result: JSON.parse(outputText) });
  } catch {
    return jsonResponse({ error: "AI response was not valid JSON.", raw_output: outputText }, 502);
  }
});

function buildPrompt(prompt: string, addContextFromInternet: boolean, wantsJson: boolean) {
  const contextNote = addContextFromInternet
    ? "Use your built-in knowledge only. If current public web verification is required, say what should be verified instead of inventing live web results."
    : "";
  const outputNote = wantsJson
    ? "Return only JSON that matches the supplied schema. Do not include markdown fences or explanatory text."
    : "Return a concise, useful answer.";

  return [
    "You are a procurement document analysis assistant for Tobolar Procurement.",
    "Read procurement documents carefully and extract operationally useful data.",
    contextNote,
    outputNote,
    "",
    prompt,
  ].filter(Boolean).join("\n");
}

function toOpenAIContent(fileUrl: string) {
  const extension = getExtension(fileUrl);
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(extension)) {
    return {
      type: "input_image",
      image_url: fileUrl,
      detail: "high",
    };
  }

  return {
    type: "input_file",
    file_url: fileUrl,
    filename: getFilename(fileUrl),
  };
}

function extractOutputText(result: any) {
  if (typeof result.output_text === "string") return result.output_text;

  const message = result.output?.find((item: any) => item.type === "message");
  const textPart = message?.content?.find((item: any) => item.type === "output_text");
  if (typeof textPart?.text === "string") return textPart.text;

  return "";
}

function getExtension(url: string) {
  const path = url.split("?")[0] || "";
  return path.split(".").pop()?.toLowerCase() || "";
}

function getFilename(url: string) {
  const path = url.split("?")[0] || "";
  return decodeURIComponent(path.split("/").pop() || "document");
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
