type AssistantBody = { topic?: string; question?: string; notes?: string };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "O assistente ainda não foi configurado." });
    return;
  }
  const body = (req.body || {}) as AssistantBody;
  const topic = String(body.topic || "anatomia").slice(0, 200);
  const question = String(body.question || "").trim().slice(0, 500);
  const notes = String(body.notes || "").trim().slice(0, 12000);
  if (!question) {
    res.status(400).json({ error: "Escreva uma pergunta para o assistente." });
    return;
  }
  const prompt = [
    "Você é o assistente de estudo do Anatomed, uma plataforma educacional de anatomia.",
    "Responda em português do Brasil, com clareza e brevidade. Ajude a organizar o raciocínio, sem substituir aulas, livros ou orientação clínica.",
    `Tema: ${topic}`,
    `Pergunta: ${question}`,
    notes ? `Anotações do estudante:\n${notes}` : "O estudante ainda não escreveu anotações.",
  ].join("\n\n");
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await response.json() as any;
    if (!response.ok) {
      res.status(502).json({ error: "O assistente não conseguiu responder agora." });
      return;
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join("\n") || "Não consegui gerar uma resposta agora.";
    res.status(200).json({ answer });
  } catch {
    res.status(502).json({ error: "O assistente não conseguiu responder agora." });
  }
}

