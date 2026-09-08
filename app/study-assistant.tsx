import { useMemo, useState } from "react";
import { Bot, Lightbulb, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { lessons } from "./study-content";

function localAnswer(topic: string, question: string, body: string) {
  const lesson = lessons.find((item) => item.title === topic);
  const anchor = lesson?.points[0] || "comece identificando a estrutura, sua função e suas relações";
  const task = lesson?.task || "compare a forma, a função e as conexões com outras estruturas";
  const clean = question.trim().replace(/[?!.]+$/, "");
  return `Vamos organizar isso em uma revisão curta. Para ${topic || "este assunto"}, comece por ${anchor.toLowerCase()}.\n\n`+
    `Pergunta-guia: ${clean || "qual é a ideia central"}? Relacione a resposta com a função e com a localização anatômica. ${task}\n\n` +
    (body.trim()
      ? "A partir do que você escreveu, procure acrescentar: definição, relações, função e uma dúvida que ficou aberta."
      : "Escreva primeiro uma hipótese com suas próprias palavras; depois confira no resumo e nas fontes científicas.");
}

export default function StudyAssistant({ topic, body }: { topic: string; body: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const context = useMemo(() => topic || "anatomia", [topic]);
  const ask = async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setAnswer("");
    try {
      // If a server-side Gemini route is enabled, use it without ever sending the
      // provider key to the browser. The static demo falls back to the local tutor.
      let remote = "";
      try {
        const response = await fetch("/api/study-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: context, question, notes: body }),
        });
        if (response.ok) {
          const data = (await response.json()) as { answer?: unknown };
          if (typeof data.answer === "string") remote = data.answer;
        }
      } catch {
        /* Static hosting has no API route yet; keep the study flow available. */
      }
      if (!remote) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        remote = localAnswer(context, question, body);
      }
      setAnswer(remote);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="study-assistant" aria-labelledby="study-assistant-title">
      <div className="study-assistant-heading">
        <div className="study-assistant-mark"><Bot size={19} /></div>
        <div>
          <p className="overline">ASSISTENTE DE ESTUDO</p>
          <h2 id="study-assistant-title">Uma pergunta para destravar a próxima ideia.</h2>
          <p>Use o que você escreveu como ponto de partida. A resposta é uma orientação de estudo, não substitui a bibliografia.</p>
        </div>
        <Sparkles size={18} className="study-assistant-spark" aria-hidden="true" />
      </div>
      <div className="study-assistant-context">
        <Lightbulb size={16} /> Tema atual: <strong>{context}</strong>
      </div>
      <Textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void ask();
        }}
        maxLength={500}
        placeholder="Ex.: qual é a relação entre essa estrutura e a circulação?"
        aria-label="Pergunte ao assistente de estudo"
      />
      <div className="study-assistant-actions">
        <small>Ctrl/⌘ + Enter para perguntar</small>
        <Button className="button dark" onClick={() => void ask()} disabled={!question.trim() || busy}>
          <Send size={16} /> {busy ? "Pensando…" : "Ajudar a estudar"}
        </Button>
      </div>
      {answer && <div className="study-assistant-answer" role="status">{answer}</div>}
    </section>
  );
}
