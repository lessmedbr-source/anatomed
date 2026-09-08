import SummaryEditor from './summary-editor';
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Box,
  BookOpen,
  NotebookPen,
  Search,
  LogOut,
  ShieldCheck,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "./brand";
import { api, type Session } from "./api";
import { lessons, scholar, pubmed, papers, textbook } from "./study-content";
export function WorkspaceShell({
  session,
  active,
  children,
}: {
  session: Session;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Brand />
        <p className="workspace-label">SEU AMBIENTE DE ESTUDO</p>
        <nav>
          {[
            { path: "/estudar", label: "Visão geral", icon: LayoutGrid },
            { path: "/atlas", label: "Atlas 3D", icon: Box },
            { path: "/resumos", label: "Resumos", icon: BookOpen },
            { path: "/caderno", label: "Meu caderno", icon: NotebookPen },
            { path: "/biblioteca", label: "Pesquisa científica", icon: Search },
          ].map((n) => (
            <a key={n.path} href={n.path} className={active === n.path ? "active" : ""}>
              <n.icon size={19} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="workspace-user">
          <div className="avatar">{session.user?.name?.[0]?.toUpperCase() || "A"}</div>
          <div>
            <strong>{session.user?.name || "Seu espaço"}</strong>
            <small>
              {session.user?.role === "owner"
                ? "Proprietário"
                : session.user?.role === "teacher"
                  ? "Professor(a)"
                  : "Estudante"}
            </small>
          </div>
        </div>
        {session.user?.role === "owner" && (
          <a href="/admin" className="sidebar-link">
            <ShieldCheck size={16} /> Administração
          </a>
        )}
        <button
          className="sidebar-link"
          onClick={async () => {
            sessionStorage.removeItem("anatomed_demo_access");
            try {
              await api("/auth/logout", { method: "POST" });
            } catch {
              /* Demo access has no server session yet. */
            }
            location.assign("/");
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <span>APRENDER É FAZER CONEXÕES.</span>
          <a href="/">
            Ir ao site <ArrowUpRight size={15} />
          </a>
        </header>
        {children}
      </div>
    </div>
  );
}
export function StudyHome() {
  return (
    <div className="workspace-content">
      <div className="page-heading">
        <p className="overline">SEU ESTUDO, EM PERSPECTIVA</p>
        <h1>O que vamos explorar hoje?</h1>
        <p>Observe uma estrutura, revise a teoria e registre o que você entendeu.</p>
      </div>
      <a className="start-atlas" href="/atlas">
        <div>
          <span className="overline">ATLAS INTERATIVO</span>
          <h2>
            Comece pelo corpo.
            <br />
            Descubra as conexões.
          </h2>
          <span className="button light">
            Abrir atlas 3D <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="atlas-type" aria-hidden="true">
          3D<span>2.234 ESTRUTURAS</span>
        </div>
      </a>
      <div className="section-row">
        <h2>Uma base para cada sistema</h2>
        <a href="/resumos">
          Ver todos os resumos <ArrowRight size={16} />
        </a>
      </div>
      <div className="lesson-grid">
        {lessons.slice(0, 4).map((l, i) => (
          <a className="lesson-card" key={l.id} href={"/resumos?sistema=" + l.id}>
            <span className="lesson-index">0{i + 1}</span>
            <BookOpen size={21} />
            <h3>{l.title}</h3>
            <p>{l.intro}</p>
            <span className="card-link">
              Começar revisão <ArrowUpRight size={17} />
            </span>
          </a>
        ))}
      </div>
      <div className="workspace-bottom-grid">
        <a href="/caderno">
          <NotebookPen size={26} />
          <h3>Sua síntese vale muito.</h3>
          <p>Escreva com suas palavras e conecte ideias no seu caderno.</p>
          <ArrowUpRight />
        </a>
        <a href="/biblioteca">
          <Search size={26} />
          <h3>Curiosidade com referência.</h3>
          <p>Encontre fontes para aprofundar o assunto que você está estudando.</p>
          <ArrowUpRight />
        </a>
      </div>
    </div>
  );
}
export function Summaries() { return <SummaryEditor />; }
export function Research() {
  const [q, setQ] = useState(new URLSearchParams(location.search).get("q") || "");
  return (
    <div className="workspace-content">
      <div className="page-heading">
        <p className="overline">CIÊNCIA PARA IR ALÉM</p>
        <h1>
          A próxima pergunta
          <br />
          merece uma boa fonte.
        </h1>
        <p>
          Pesquise pelo nome da estrutura, sistema ou tema. As buscas abrem nas bases originais.
        </p>
      </div>
      <form
        className="research-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) window.open(scholar(q), "_blank", "noopener,noreferrer");
        }}
      >
        <Label htmlFor="research">O que você quer investigar?</Label>
        <div>
          <Search size={22} />
          <Input
            id="research"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: anatomia das artérias coronárias"
            required
            maxLength={200}
          />
        </div>
        <section>
          <Button type="submit" className="button dark" disabled={!q.trim()}>
            Google Acadêmico <ArrowUpRight size={18} />
          </Button>
          <a
            className="button outline"
            href={pubmed(q || "human anatomy")}
            target="_blank"
            rel="noreferrer"
          >
            Pesquisar no PubMed <ArrowUpRight size={18} />
          </a>
        </section>
        <small>
          Não geramos resultados ou referências automaticamente. Confira autoria, ano, método e
          texto completo na fonte.
        </small>
      </form>
      <div className="section-row">
        <h2>Leituras para conhecer a base</h2>
        <span>{papers.length} publicações selecionadas</span>
      </div>
      <div className="paper-list">
        {papers.map((p) => (
          <a href={p.url} key={p.url} target="_blank" rel="noreferrer">
            <div>
              <span className="overline">
                {p.type} · {p.year}
              </span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <small>{p.author}</small>
            </div>
            <ArrowUpRight size={25} />
          </a>
        ))}
      </div>
      <p className="research-note">
        A inclusão de um artigo não significa validação clínica do Anatomed. As fontes externas
        podem estar em inglês e ter condições próprias de acesso.
      </p>
    </div>
  );
}
