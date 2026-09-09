import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, NotebookPen, Search, Layers3, Pause, Play } from "lucide-react";
import { Brand } from "./brand";
import { api, defaults, type Session } from "./api";
import { WorkspaceShell, StudyHome, Summaries, Research } from "./workspace";
import Notebook from "./notebook";
import { AtlasBoundary } from "./atlas-boundary";
import { papers } from "./study-content";
const Landing = lazy(() => import("./landing")),
  AuthView = lazy(() => import("./auth-view")),
  Admin = lazy(() => import("./admin")),
  Atlas = lazy(() => import("./page")),
  Hero = lazy(() => import("./hero"));
const demoUser: Session["user"] = {
  id: "anatomed-demo",
  name: "Juan — demonstração",
  email: "demo@anatomed.com",
  role: "student",
  access: "active",
};
const mayneDemoUser: Session["user"] = {
  id: "anatomed-mayne-demo",
  name: "Mayne — influencer",
  email: "mayne@anatomed.com",
  role: "teacher",
  access: "active",
};
export default function Product() {
  const fallback: Session = {
    user:
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("anatomed_demo_access") === "1"
      ? sessionStorage.getItem("anatomed_demo_account") === "mayne"
        ? mayneDemoUser
        : demoUser
        : null,
    authConfigured: false,
    ownerLogin: false,
    settings: defaults,
  };
  const [session, setSession] = useState<Session>(fallback),
    [error, setError] = useState("");
  const path = location.pathname;
  useEffect(() => {
    api<Session>("/session")
      .then(setSession)
      .catch(() => {
        /* Static preview remains usable until the Supabase API is connected. */
      });
  }, []);
  if (error)
    return (
      <div className="connection-error">
        <Brand />
        <h1>Não conseguimos conectar agora.</h1>
        <p>{error}</p>
        <button className="button dark" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  const loadingFallback = (
    <div className="page-loading">
      <p>Carregando…</p>
    </div>
  );
  if (path === "/")
    return (
      <Suspense fallback={loadingFallback}>
        <Landing session={session} />
      </Suspense>
    );
  if (path === "/entrar")
    return (
      <Suspense fallback={loadingFallback}>
        <AuthView session={session} />
      </Suspense>
    );
  if (path === "/acesso/confirmar") return <Confirm />;
  if (path === "/demonstracao") return <Demo />;
  if (path === "/referencias")
    return (
      <div className="reference-page section-container">
        <Brand />
        <h1>Fontes e créditos.</h1>
        <p>
          O Anatomed é uma adaptação do Human Atlas, de ashemag, sob a licença MIT. Os dados
          anatômicos são do BodyParts3D, © The Database Center for Life Science, sob CC BY 4.0.
        </p>
        <p>
          Os nomes e a interface foram adaptados para português. A apresentação e o atlas usam a
          mesma base anatômica detalhada. A opção Leve preserva as 2.234 peças com menos polígonos.
        </p>
        <a href="/ATTRIBUTION.md">Atribuição completa</a>
        <a href="/LICENSE.txt">Licença do código</a>
        <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">
          Projeto original
        </a>
        {papers.map((p) => (
          <a href={p.url} key={p.url} target="_blank" rel="noreferrer">
            {p.title} — {p.author}
          </a>
        ))}
        <a href="/">Voltar ao Anatomed</a>
      </div>
    );
  if (path === "/admin") {
    if (session.user?.role === "owner")
      return (
        <Suspense fallback={loadingFallback}>
          <Admin session={session} />
        </Suspense>
      );
    return (
      <div className="access-gate">
        <Brand />
        <h1>Administração do Anatomed.</h1>
        <p>Esta área é exclusiva do proprietário.</p>
        <a className="button dark" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">
          Entrar como proprietário <ArrowUpRight size={18} />
        </a>
        <a href="/">Voltar ao site</a>
      </div>
    );
  }
  if (!session.user)
    return (
      <div className="access-gate">
        <Brand />
        <h1>Seu estudo começa aqui.</h1>
        <p>Entre na sua conta para acessar o atlas, os resumos e o caderno.</p>
        <a className="button dark" href="/entrar">
          Entrar no Anatomed <ArrowUpRight size={18} />
        </a>
        <a href="/demonstracao">Experimentar o 3D</a>
      </div>
    );
  if (session.user.access !== "active")
    return (
      <div className="access-gate">
        <Brand />
        <h1>
          {session.user.access === "blocked"
            ? "Seu acesso está suspenso."
            : "Sua conta está criada."}
        </h1>
        <p>
          {session.user.access === "blocked"
            ? "Fale com o suporte para revisar o seu acesso."
            : "O acesso ao conteúdo será liberado após a confirmação do pagamento."}
        </p>
        {session.settings.checkoutUrl && session.user.access === "pending" && (
          <a href={session.settings.checkoutUrl} className="button dark">
            Concluir aquisição <ArrowUpRight size={18} />
          </a>
        )}
        {session.settings.supportEmail && (
          <a href={"mailto:" + session.settings.supportEmail}>Falar com o suporte</a>
        )}
        <a href="/">Voltar ao site</a>
      </div>
    );
  if (path === "/atlas")
    return (
      <Suspense fallback={loadingFallback}>
        <div className="atlas-product">
          <AtlasBoundary>
            <Atlas />
          </AtlasBoundary>
          <nav className="atlas-product-nav">
            <a href="/estudar">
              <ArrowLeft size={15} /> Meu espaço
            </a>
            <a href="/caderno">
              <NotebookPen size={15} /> Caderno
            </a>
            <a href="/biblioteca">
              <Search size={15} /> Pesquisar
            </a>
          </nav>
        </div>
      </Suspense>
    );
  const content =
    path === "/estudar" ? (
      <StudyHome />
    ) : path === "/resumos" ? (
      <Summaries />
    ) : path === "/caderno" ? (
      <Notebook demo={session.user?.id === "anatomed-demo"} />
    ) : path === "/biblioteca" ? (
      <Research />
    ) : (
      <div className="workspace-content">
        <h1>Página não encontrada.</h1>
        <a href="/estudar">Voltar ao meu espaço</a>
      </div>
    );
  return (
    <WorkspaceShell session={session} active={path}>
      {content}
    </WorkspaceShell>
  );
}
function Demo() {
  const [separated, split] = useState(false),
    [paused, pause] = useState(false);
  return (
    <div className="demo-page">
      <header className="site-header">
        <Brand light />
        <a className="button light small" href="/#acesso">
          Conhecer o acesso <ArrowUpRight size={17} />
        </a>
      </header>
      <div className="demo-copy">
        <p className="overline">EXPERIMENTE UMA NOVA PERSPECTIVA</p>
        <h1>
          O corpo.
          <br />
          Em movimento.
        </h1>
        <p>
          Arraste para girar.
          <br />
          Revele as camadas e observe as relações.
        </p>
        <div className="demo-buttons">
          <button className="button light" onClick={() => split(!separated)}>
            <Layers3 size={17} />
            {separated ? "Reunir corpo" : "Revelar camadas"}
          </button>
          <button
            className="button outline"
            onClick={() => pause(!paused)}
            aria-label={paused ? "Retomar movimento" : "Pausar movimento"}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>
        <small>
          Modelo anatômico colorido, com detalhe adaptado ao dispositivo.
          <br />O atlas completo permite buscar e selecionar cada peça.
        </small>
        <a href="/">Voltar à apresentação</a>
      </div>
      <Suspense fallback={<div className="art-state">Carregando modelo…</div>}>
        <Hero separated={separated} paused={paused} />
      </Suspense>
    </div>
  );
}
function Confirm() {
  const [error, err] = useState(""),
    [recovery, setRecovery] = useState(false),
    [ready, setReady] = useState(false),
    [message, msg] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1)),
      recovery = params.get("type") === "recovery";
    const access_token = params.get("access_token"),
      refresh_token = params.get("refresh_token");
    history.replaceState({}, "", location.pathname);
    if (!access_token) {
      err("O link é inválido ou expirou. Solicite um novo e-mail.");
      return;
    }
    api("/auth/finish", { method: "POST", body: JSON.stringify({ access_token, refresh_token }) })
      .then(() => {
        if (recovery) {
          setRecovery(true);
          setReady(true);
        } else location.assign("/estudar");
      })
      .catch((e) => err(e.message));
  }, []);
  return (
    <div className="access-gate">
      <Brand />
      <h1>{recovery ? "Escolha sua nova senha." : "Confirmando seu acesso."}</h1>
      {ready && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/auth/password", {
                method: "POST",
                body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }),
              });
              msg("Senha atualizada. Entre novamente com a nova senha.");
            } catch (e) {
              err((e as Error).message);
            }
          }}
        >
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            placeholder="Nova senha: pelo menos 10 caracteres"
          />
          <button className="button dark">Salvar senha</button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
      <a href="/entrar">Ir para o login</a>
    </div>
  );
}

