// /api/verify-scan.js
// Vercel serverless function (Node.js runtime, no framework needed).
// Receives a photo + a target object description, asks an AI vision model
// whether the photo actually contains that object, and returns a verdict.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, target } = req.body || {};

  if (!image || !target) {
    return res.status(400).json({ error: "Missing image or target" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 150,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You verify scavenger-hunt photos taken on a phone camera, often at an angle, partially cropped, " +
              "blurry, or poorly lit. Be lenient: if the object is visibly present anywhere in the frame — even " +
              "partially, even not centered, even if something else is also in frame — that counts as a match. " +
              "Only reject if the object is clearly absent. Reply with ONLY a JSON object, no markdown, no extra " +
              'text: {"confidence": 0-1 number, "reason": "short phrase"}. confidence is how likely the object ' +
              "is present in the photo (0 = definitely not there, 1 = definitely there).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Is there ${target} visible anywhere in this photo?` },
              { type: "image_url", image_url: { url: image, detail: "auto" } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return res.status(502).json({ error: "AI verification failed", detail: errText });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error("Failed to parse AI response:", raw);
      return res.status(502).json({ error: "Could not parse AI response", raw });
    }

    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    // Lenient threshold — favors letting real matches through over blocking them.
    const match = confidence >= 0.35;

    return res.status(200).json({
      match,
      confidence,
      reason: parsed.reason || null,
    });
  } catch (err) {
    console.error("verify-scan error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
