import { displayName, matchesName, nameMeaning } from "./localization";
import { flushSync } from "react-dom";
import { registerAtlasTools } from "./agent-tools";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Focus,
  Info,
  Layers3,
  Pause,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import AnatomyScene from "./scene";
import AtlasStudy from './atlas-study';
import { defaultModelQuality, modelManifest } from "./model-quality";
import { ModelQualityControl } from "./model-quality-control";
import {
  DEFAULT_VISIBLE,
  SYSTEMS,
  specificExplanation,
  explanation,
  type Atlas,
  type Concept,
  type SceneState,
  type SystemId,
  type View,
} from "./anatomy";
const initial: SceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  view: "three-quarter",
  rotate: false,
  reset: 0,
};
export default function Home() {
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const [quality, setQuality] = useState(defaultModelQuality);
  const [atlas, setAtlas] = useState<Atlas | null>(null),
    [state, setState] = useState(initial),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [panel, setPanel] = useState<"layers" | "search" | null>(null),
    [details, setDetails] = useState(false),
    [about, setAbout] = useState(false),
    [query, setQuery] = useState(""),
    [chosen, setChosen] = useState<Concept | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setProgress(0);
    setError("");
    setAtlas(null);
    setChosen(null);
    setDetails(false);
    setState({ ...initial, visible: DEFAULT_VISIBLE });
    fetch(modelManifest(quality), { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Não foi possível carregar o catálogo anatômico.");
        return r.json();
      })
      .then((data) => {
        if (abort.signal.aborted) return;
        const catalog = data as Atlas;
        if (
          !Array.isArray(catalog.parts) ||
          !catalog.parts.length ||
          !Array.isArray(catalog.chunks)
        )
          throw Error("O catálogo anatômico está incompleto. Recarregue o visualizador.");
        setAtlas(data as Atlas);
        const system = new URLSearchParams(location.search).get("sistema");
        if (SYSTEMS.some((s) => s.id === system))
          setState((s) => ({ ...s, visible: [system as SystemId] }));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [quality]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setPanel("search");
        setDetails(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const parts = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        SYSTEMS.map((s) => [s.id, atlas?.parts.filter((p) => p.system === s.id).length ?? 0]),
      ),
    [atlas],
  );
  const activeSystems = SYSTEMS.filter((s) => counts[s.id] > 0);
  const selectedParts = state.selected.map((id) => parts.get(id)).filter((p) => !!p),
    selected = selectedParts[0],
    system = SYSTEMS.find((s) => s.id === selected?.system);
  const visibleCount =
    atlas?.parts.filter((p) =>
      state.isolate
        ? state.selected.includes(p.id)
        : state.visible.includes(p.system) || state.selected.includes(p.id),
    ).length ?? 0;
  const results = useMemo(() => {
    if (!atlas) return [];
    const term = query.toLowerCase().trim();
    if (!term)
      return [
        "heart",
        "brain",
        "liver",
        "stomach",
        "spleen",
        "pancreas",
        "urinary bladder",
        "trachea",
      ]
        .map((name) => atlas.concepts.find((c) => c.name.toLowerCase() === name))
        .filter((x): x is Concept => !!x);
    return atlas.concepts
      .filter((c) => matchesName(c.name, c.id, term))
      .sort((a, b) => displayName(a.name).length - displayName(b.name).length)
      .slice(0, 80);
  }, [atlas, query]);
  const choose = (c: Concept) => {
    setChosen(c);
    setState((s) => ({ ...s, selected: c.elements, isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };
  useEffect(() => {
    if (!atlas) return;
    return registerAtlasTools(atlas, (c) => flushSync(() => choose(c)));
  }, [atlas]);
  const choosePart = (id: string) => {
    const p = parts.get(id);
    if (!p) return;
    setChosen({ id: p.conceptId, name: p.name, elements: [id] });
    setState((s) => ({ ...s, selected: [id], isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };
  const toggle = (id: SystemId) => {
    setDetails(false);
    setState((s) => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id],
    }));
  };
  const reset = () => {
    setState((s) => ({ ...initial, visible: DEFAULT_VISIBLE, reset: s.reset + 1 }));
    setChosen(null);
    setDetails(false);
    setPanel(null);
  };
  const openPanel = (next: "layers" | "search") => {
    setDetails(false);
    setPanel((p) => (p === next ? null : next));
  };
  return (
    <main className="studio">
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{ ...state, inspectorOpen: details && selectedParts.length > 0 }}
          onSelect={choosePart}
          onProgress={(n) => {
            setProgress(n);
          }}
          onError={setError}
        />
      )}
      <div className="vignette" />
      <div className="atlas-quality">
        <ModelQualityControl value={quality} onChange={setQuality} />
      </div>
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> ANATOMIA INTERATIVA
        </div>
        <h1>
          ANATOMED
          <Badge variant="outline" className="edition">
            3D
          </Badge>
        </h1>
        <div className="identity-meta">
          {atlas ? atlas.parts.length.toLocaleString("pt-BR") : "2.234"} peças anatômicas{" "}
          <span>·</span> BodyParts3D
        </div>
      </header>
      <nav className="top-actions" aria-label="Painéis do atlas">
        <Button
          variant="ghost"
          className={panel === "search" ? "active" : ""}
          onClick={() => openPanel("search")}
          aria-label="Buscar estruturas"
        >
          <Search size={18} />
          <span>Buscar estrutura</span>
          <kbd>/</kbd>
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="Sobre o ANATOMED"
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          <Info size={18} />
        </Button>
      </nav>
      <section
        className={`layers-panel glass ${panel === "layers" ? "mobile-open" : ""}`}
        aria-label="Camadas anatômicas"
      >
        <div className="panel-heading">
          <span>Sistemas</span>
          <Button
            variant="ghost"
            className="mobile-only icon-button"
            onClick={() => setPanel(null)}
            aria-label="Fechar sistemas"
          >
            <X size={18} />
          </Button>
          <Badge variant="secondary" className="desktop-only small-number">
            {activeSystems.length}
          </Badge>
        </div>
        <div className="layer-presets">
          <Button
            variant="ghost"
            aria-pressed={activeSystems.every((x) => state.visible.includes(x.id))}
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: activeSystems.map((x) => x.id),
              }))
            }
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            aria-pressed={state.visible.length === 1 && state.visible[0] === "skeletal"}
            onClick={() =>
              setState((s) => ({ ...s, selected: [], isolate: false, visible: ["skeletal"] }))
            }
          >
            Esqueleto
          </Button>
          <Button
            variant="ghost"
            aria-pressed={
              state.visible.length === 6 &&
              ["cardiac", "respiratory", "digestive", "urinary", "endocrine", "reproductive"].every(
                (id) => state.visible.includes(id as SystemId),
              )
            }
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: [
                  "cardiac",
                  "respiratory",
                  "digestive",
                  "urinary",
                  "endocrine",
                  "reproductive",
                ],
              }))
            }
          >
            Órgãos
          </Button>
        </div>
        <div className="system-list">
          {activeSystems.map((s) => (
            <div
              className={`system-row ${state.visible.includes(s.id) ? "enabled" : ""}`}
              key={s.id}
            >
              <Button
                variant="ghost"
                className="system-name"
                title={`Mostrar apenas: ${s.name.toLowerCase()}`}
                onClick={() =>
                  setState((v) => ({ ...v, visible: [s.id], isolate: false, selected: [] }))
                }
              >
                <span className="system-dot" style={{ background: s.color }} />
                {s.name}
                <span className="system-count">{counts[s.id]}</span>
              </Button>
              <Switch
                checked={state.visible.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
                aria-label={`Mostrar: ${s.name.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
        <div className="panel-foot">
          <span>{visibleCount.toLocaleString("pt-BR")} peças visíveis</span>
          <Button
            variant="ghost"
            onClick={() => setState((s) => ({ ...s, visible: [], selected: [], isolate: false }))}
          >
            Ocultar
          </Button>
        </div>
      </section>
      {panel === "search" && (
        <section className="search-panel glass" aria-label="Buscar anatomia">
          <div className="panel-heading">
            <span>Buscar estrutura</span>
            <Button
              variant="ghost"
              className="icon-button"
              onClick={() => setPanel(null)}
              aria-label="Fechar busca"
            >
              <X size={18} />
            </Button>
          </div>
          <Combobox<Concept>
            items={results}
            value={null}
            onValueChange={(value) => {
              if (value) choose(value);
            }}
            inputValue={query}
            onInputValueChange={setQuery}
            itemToStringLabel={(c) => displayName(c.name)}
            filter={null}
            open
            onOpenChange={(open) => {
              if (!open) setPanel(null);
            }}
          >
            <ComboboxInput
              autoFocus
              placeholder="Coração, fêmur, nervo craniano…"
              aria-label="Buscar nomes das estruturas anatômicas"
              showTrigger={false}
            />
            <ComboboxContent className="anatomy-search-results">
              <ComboboxEmpty>Nenhuma estrutura encontrada.</ComboboxEmpty>
              <ComboboxList>
                {(c: Concept) => (
                  <ComboboxItem key={c.id} value={c}>
                    <span className="search-result-name">{displayName(c.name)}</span>
                    <span className="small-number">
                      {c.elements.length} {c.elements.length === 1 ? "peça" : "peças"}
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <p className="search-note">
            {query
              ? "Até 80 resultados. Refine a busca para encontrar estruturas menores."
              : "Busque em português ou inglês, com ou sem acentos."}
          </p>
        </section>
      )}
      <nav className="view-controls glass" aria-label="Controles da câmera">
        {(["three-quarter", "front", "side", "back"] as View[]).map((v, i) => (
          <Button
            variant="ghost"
            key={v}
            className={state.view === v ? "active" : ""}
            aria-pressed={state.view === v}
            disabled={state.explode > 0.8 && v !== "front"}
            onClick={() => setState((s) => ({ ...s, view: v, reset: s.reset + 1, rotate: false }))}
            title={`${{ "three-quarter": "Vista em três quartos", front: "Vista frontal", side: "Vista lateral", back: "Vista posterior" }[v]}`}
            aria-label={`${{ "three-quarter": "Vista em três quartos", front: "Vista frontal", side: "Vista lateral", back: "Vista posterior" }[v]}`}
          >
            <span>{["¾", "F", "L", "P"][i]}</span>
          </Button>
        ))}
        <i />
        <Button
          variant="ghost"
          disabled={state.explode >= 0.4}
          aria-label={state.rotate ? "Pausar rotação" : "Girar corpo"}
          title="Rotação automática"
          className={state.rotate ? "active" : ""}
          onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
        >
          {state.rotate ? <Pause size={17} /> : <RotateCw size={18} />}
        </Button>
        <Button
          variant="ghost"
          aria-label="Restaurar vista e camadas"
          title="Restaurar"
          onClick={reset}
        >
          <RotateCcw size={17} />
        </Button>
      </nav>
      <div className="scene-caption">
        <span className="caption-line" />
        <span>
          {state.isolate
            ? displayName(chosen?.name) || "ESTRUTURA SELECIONADA"
            : state.explode > 0.95
              ? "INVENTÁRIO ANATÔMICO"
              : state.explode > 0.05
                ? "ESTRUTURAS SEPARADAS"
                : "CORPO ADULTO · MASCULINO"}
        </span>
        <span className="caption-line" />
      </div>
      <div className="bottom-dock glass">
        <Button
          variant="ghost"
          className="mobile-only dock-layers"
          onClick={() => openPanel("layers")}
          aria-label="Abrir camadas dos sistemas"
        >
          <Layers3 size={20} />
          <span>Sistemas</span>
        </Button>
        <div className="explode-control">
          <div className="explode-label">
            <label id="explode-label">Separar</label>
            <output>
              {Math.round(state.explode * 100)}
              <span>%</span>
            </output>
          </div>
          <Slider
            aria-labelledby="explode-label"
            min={0}
            max={100}
            step={1}
            value={[state.explode * 100]}
            onValueChange={(v) =>
              setState((s) => ({
                ...s,
                explode: (Array.isArray(v) ? v[0] : v) / 100,
                view: (Array.isArray(v) ? v[0] : v) > 80 ? "front" : s.view,
                rotate: false,
              }))
            }
          />
          <div className="slider-endpoints">
            <span>Reunido</span>
            <span>Separado</span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="dock-reset"
          onClick={reset}
          aria-label="Reunir peças e restaurar"
        >
          <RotateCcw size={18} />
          <span>Restaurar</span>
        </Button>
      </div>
      <footer className="studio-footer">
        <span>
          {state.explode > 0.8 ? "Arraste para deslocar" : "Arraste para girar"} <b>·</b> Pinça ou
          rolagem para ampliar <b>·</b> Toque para explorar
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          Fontes e créditos <ArrowUpRight size={12} />
        </Button>
      </footer>
      {progress < 100 && !error && (
        <div className="loading glass" role="status">
          <Activity size={18} />
          <div>
            <strong>Preparando a anatomia</strong>
            <span>
              {progress}% · Carregando {atlas?.parts.length.toLocaleString("pt-BR") ?? "2.234"}{" "}
              peças
            </span>
            <div className="loading-track">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="loading glass error" role="alert">
          <p>{error}</p>
          <Button variant="ghost" onClick={() => location.reload()}>
            Recarregar visualizador
          </Button>
        </div>
      )}
      <Sheet
        open={details && selectedParts.length > 0}
        modal={false}
        disablePointerDismissal
        onOpenChange={setDetails}
      >
        <SheetContent
          initialFocus={detailTitle}
          className={`detail-sheet glass ${state.isolate ? "is-isolated" : ""}`}
          showCloseButton={false}
        >
          <SheetClose
            aria-label="Fechar detalhes"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <X size={18} />
          </SheetClose>
          <div className="detail-header">
            <div className="detail-accent" style={{ background: system?.color }} />
            <div className="eyebrow">{system?.name ?? "ANATOMIA"}</div>
            <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">
              {displayName(chosen?.name)}
            </SheetTitle>
          </div>
          <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
            <SheetDescription className="structure-description">
              {chosen && selected ? explanation(chosen.name, selected.system) : ""}
            </SheetDescription>
            {chosen && !specificExplanation(chosen.name) && (
              <span className="context-note">
                Visão geral do sistema ao qual esta estrutura pertence.
              </span>
            )}
            {chosen && (
              <div className="original-name">
                <span>Nome original</span>
                <p lang="en">{chosen.name}</p>
              </div>
            )}
            {chosen && nameMeaning(chosen.name).length > 0 && (
              <div className="name-meaning">
                <h3>Como entender o nome</h3>
                {nameMeaning(chosen.name).map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            )}
            <div className="structure-meta">
              <span>
                Referência no atlas<strong>{chosen?.id}</strong>
              </span>
              <span>
                Peças selecionadas<strong>{state.selected.length.toLocaleString("pt-BR")}</strong>
              </span>
            </div>
            {selectedParts.length > 1 && (
              <div className="member-list">
                <h3>Estruturas incluídas</h3>
                {selectedParts.slice(0, 50).map((p) => (
                  <Button variant="ghost" key={p.id} onClick={() => choosePart(p.id)}>
                    <span>{displayName(p.name)}</span>
                    <ChevronRight size={14} />
                  </Button>
                ))}
                {selectedParts.length > 50 && (
                  <p>E mais {selectedParts.length - 50} peças anatômicas.</p>
                )}
              </div>
            )}
            {chosen && (
              <div className="atlas-study-actions">
                <AtlasStudy title={displayName(chosen.name)} parts={selectedParts.map(p => displayName(p.name))} description={selected ? explanation(chosen.name, selected.system) : ''} ready={progress >= 100 && !error} />
                <a href={"/caderno?estrutura=" + encodeURIComponent(displayName(chosen.name))}>
                  Anotar sobre esta estrutura <ArrowUpRight size={14} />
                </a>
                <a href={"/biblioteca?q=" + encodeURIComponent(chosen.name + " anatomy")}>
                  Pesquisar referências <ArrowUpRight size={14} />
                </a>
              </div>
            )}
            <a
              className="source-link"
              href="https://lifesciencedb.jp/bp3d/"
              target="_blank"
              rel="noreferrer"
            >
              Consultar fonte anatômica <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="detail-actions">
            <Button
              className={`primary-action ${state.isolate ? "active" : ""}`}
              onClick={() => setState((s) => ({ ...s, isolate: !s.isolate, explode: 0 }))}
            >
              <Focus size={18} />
              {state.isolate ? "Mostrar estruturas ao redor" : "Isolar estrutura"}
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="ghost"
              className="secondary-action"
              onClick={() => {
                setState((s) => ({ ...s, selected: [], isolate: false }));
                setDetails(false);
              }}
            >
              Limpar seleção
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={about} onOpenChange={setAbout}>
        <SheetContent className="about-sheet glass" showCloseButton={false}>
          <SheetClose
            aria-label="Fechar informações"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <X size={18} />
          </SheetClose>
          <div className="eyebrow">FONTES E ABRANGÊNCIA</div>
          <SheetTitle className="structure-title">ANATOMED</SheetTitle>
          <SheetDescription>
            Explore a anatomia humana em 3D, com nomes e explicações em português brasileiro.
          </SheetDescription>
          <div className="about-copy">
            <p>
              <strong>Corpo masculino · BodyParts3D</strong>
              <br />
              2.234 peças individuais e 3.432 conceitos anatômicos de um modelo de referência
              masculino adulto.
            </p>
            <p>
              Este modelo não inclui todas as estruturas ou variações do corpo humano. Um conceito
              pode reunir várias peças; cada peça original aparece uma única vez.
            </p>
            <p>
              As cores e os agrupamentos por sistema ajudam na exploração. Os modelos foram
              simplificados para funcionar no navegador. As explicações têm finalidade educativa; o
              atlas não é uma ferramenta de diagnóstico ou planejamento cirúrgico.
            </p>
            <h3>Projeto original</h3>
            <p>
              Baseado no Human Atlas, de ashemag, disponibilizado sob a licença MIT. Adaptação
              ANATOMED com interface e nomenclatura em português brasileiro. Os nomes originais e os
              identificadores foram preservados para consulta.
            </p>
            <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">
              Human Atlas — código original <ArrowUpRight size={14} />
            </a>
            <a href="/LICENSE.txt" target="_blank" rel="noreferrer">
              Licença do aplicativo <ArrowUpRight size={14} />
            </a>
            <h3>Dados anatômicos</h3>
            <p>
              BodyParts3D, © The Database Center for Life Science. Dados disponibilizados sob a
              licença Creative Commons Atribuição 4.0 Internacional.
            </p>
            <a
              href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html"
              target="_blank"
              rel="noreferrer"
            >
              Licença dos dados <ArrowUpRight size={14} />
            </a>
            <a
              href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html"
              target="_blank"
              rel="noreferrer"
            >
              Modelos e metadados originais <ArrowUpRight size={14} />
            </a>
            <a
              href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752"
              target="_blank"
              rel="noreferrer"
            >
              Ler a publicação científica original <ArrowUpRight size={14} />
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
