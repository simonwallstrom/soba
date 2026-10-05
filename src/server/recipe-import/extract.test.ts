import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { cleanRecipe, clip, ExtractionError, ModelBusyError, requestExtraction } from "./extract";
import type { Source } from "./extract";

const extraction = {
  isRecipe: true,
  title: "  Pannkakor ",
  description: "Tunna pannkakor.",
  servings: 4,
  ingredients: [{ heading: null, items: ["3 dl vetemjöl", " ", "6 dl mjölk"] }],
  instructions: [
    { heading: " Smet ", items: ["Vispa ihop."] },
    { heading: "Tom", items: [""] },
  ],
  tags: ["frukost", "Brand new tag", "Frukost"],
};

describe("cleanRecipe", () => {
  test("trims the recipe and drops empty lines and sections", () => {
    expect(cleanRecipe(extraction, ["Frukost", "Middag"])).toEqual({
      title: "Pannkakor",
      description: "Tunna pannkakor.",
      servings: 4,
      ingredients: [{ items: ["3 dl vetemjöl", "6 dl mjölk"] }],
      instructions: [{ heading: "Smet", items: ["Vispa ihop."] }],
      tags: ["Frukost"],
    });
  });

  test("keeps only the household's own tags", () => {
    expect(cleanRecipe(extraction, []).tags).toEqual([]);
  });

  test("drops servings that make no sense", () => {
    expect(cleanRecipe({ ...extraction, servings: 0 }, []).servings).toBeNull();
  });

  test("rejects a source without a recipe", () => {
    expect(() => cleanRecipe({ ...extraction, isRecipe: false }, [])).toThrow(ExtractionError);
    expect(() => cleanRecipe({ ...extraction, ingredients: [], instructions: [] }, [])).toThrow(
      ExtractionError,
    );
  });
});

describe("clip", () => {
  test("leaves short text alone", () => {
    expect(clip("Kort text.", 20)).toBe("Kort text.");
  });

  test("shortens at a word boundary", () => {
    const clipped = clip("En lång beskrivning som fortsätter, och fortsätter", 30);
    expect(clipped).toBe("En lång beskrivning som…");
    expect(clipped.length).toBeLessThanOrEqual(30);
  });
});

const gateway = { url: "https://gateway.example/v1/account/default/", token: "token" };
const settings = { language: "sv" as const, units: "metric" as const, tagNames: [] };
const photos: Source = {
  kind: "photos",
  photos: [{ bytes: new Uint8Array([1, 2, 3]), type: "image/jpeg" }],
};

// Answers the next request like the gateway would, with the given message content.
function answerWith(content: string, status = 200) {
  return spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 120, completion_tokens: 40 },
      }),
      { status },
    ),
  );
}

describe("requestExtraction", () => {
  afterEach(() => mock.restore());

  test("asks the gateway's provider-neutral endpoint for a recipe as JSON", async () => {
    const fetchSpy = answerWith(JSON.stringify(extraction));
    const result = await requestExtraction(gateway, "anthropic/claude-haiku-4-5", photos, settings);

    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 40 });
    expect(result.extraction.title).toBe("  Pannkakor ");
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://gateway.example/v1/account/default/compat/chat/completions");
    expect(new Headers(init?.headers).get("cf-aig-authorization")).toBe("Bearer token");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    expect(body.model).toBe("anthropic/claude-haiku-4-5");
    expect(body.response_format.json_schema.schema.$schema).toBeUndefined();
    expect(body.messages[1].content[0]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,AQID" },
    });
  });

  test("reads JSON that a provider wrapped in a code fence", async () => {
    answerWith(`Here it is:\n\`\`\`json\n${JSON.stringify(extraction)}\n\`\`\``);
    const result = await requestExtraction(gateway, "m", photos, settings);
    expect(result.extraction.isRecipe).toBe(true);
  });

  test("reads JSON that the gateway returned as a tool call", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [{ function: { name: "recipe", arguments: JSON.stringify(extraction) } }],
            },
            finish_reason: "tool_calls",
          },
        ],
      }),
    );
    const result = await requestExtraction(gateway, "m", photos, settings);
    expect(result.extraction.title).toBe("  Pannkakor ");
  });

  test("asks again without the response format when a model rejects it", async () => {
    const fetchSpy = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("tool_choice not supported", { status: 400 }))
      .mockResolvedValueOnce(
        Response.json({ choices: [{ message: { content: JSON.stringify(extraction) } }] }),
      );
    const result = await requestExtraction(gateway, "m", photos, settings);
    expect(result.extraction.isRecipe).toBe(true);
    const bodies = fetchSpy.mock.calls.map(([, init]) =>
      typeof init?.body === "string" ? JSON.parse(init.body) : null,
    );
    expect(bodies.map((body) => "response_format" in body)).toEqual([true, false]);
  });

  test("reports a busy provider separately", () => {
    answerWith("", 429);
    return expect(requestExtraction(gateway, "m", photos, settings)).rejects.toThrow(
      ModelBusyError,
    );
  });

  test("rejects an answer that is not a recipe card", () => {
    answerWith("Sorry, I cannot read that.");
    return expect(requestExtraction(gateway, "m", photos, settings)).rejects.toThrow(
      ExtractionError,
    );
  });
});
