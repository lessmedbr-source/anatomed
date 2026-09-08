import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  NotebookPen,
  Plus,
  Save,
  Search,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { api } from "./api";
import { Brand } from './brand';
import { readStudy, writeStudy, type StudyImage } from './study-store';
import { downloadNotePdf } from './note-pdf';
import { lessons } from "./study-content";
import StudyAssistant from "./study-assistant";
import "./notebook.css";

type Note = { id: string; title: string; body: string; structure: string; updatedAt: string; images?: StudyImage[] };
type Draft = Pick<Note, "title" | "body" | "structure" | "images">;
const fonts = [
  { value: "editorial", label: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { value: "modern", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  {
    value: "literary",
    label: "Palatino",
    family: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  { value: "mono", label: "Monoespaçada", family: '"Courier New", Courier, monospace' },
];
const sizes = [16, 18, 20, 24].map((value) => ({ value, label: value + " px" }));
const topicItems = [
  { value: "__free__", label: "Anotação livre" },
  ...lessons.map((lesson) => ({ value: lesson.title, label: lesson.title })),
];
const DRAFT_KEY = "anatomed-notebook-temporary-draft-v1";
const FONT_KEY = "anatomed-notebook-typography-v1";
const blank = (structure = ""): Draft => ({ title: "", body: "", structure, images: [] });
function readDraft(): Draft {
  const structure = new URLSearchParams(location.search).get("estrutura") || "";
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") as Draft | null;
    // Preserve an unfinished draft when arriving from another atlas structure.
    if (
      saved &&
      typeof saved.title === "string" &&
      typeof saved.body === "string" &&
      typeof saved.structure === "string"
    )
      return saved;
  } catch {
    /* Browser storage can be unavailable. Editing remains available. */
  }
  return blank(structure);
}
function readTypography() {
  try {
    const value = JSON.parse(localStorage.getItem(FONT_KEY) || "null");
    if (
      value &&
      fonts.some((f) => f.value === value.font) &&
      sizes.some((s) => s.value === value.size)
    )
      return { font: String(value.font), size: Number(value.size) };
  } catch {
    /* Use system fonts by default. */
  }
  return { font: "editorial", size: 18 };
}
export default function Notebook({ demo = false }: { demo?: boolean }) {
  const [draft, setDraft] = useState<Draft>(() =>
    demo ? readDraft() : blank(new URLSearchParams(location.search).get("estrutura") || ""),
  );
  const [imagesBusy, setImagesBusy] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState("");
  const [type, setType] = useState(readTypography),
    [focus, setFocus] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!demo);
  const [dirty, setDirty] = useState(() => !!(demo && (draft.title || draft.body))),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "delete" | "switch"; note?: Note } | null>(null);
  const [localState, setLocalState] = useState("Rascunho temporário nesta aba");
  const text = useRef<HTMLTextAreaElement>(null);
  const font = fonts.find((f) => f.value === type.font) || fonts[0];
  const count = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  const requestedStructure = new URLSearchParams(location.search).get("estrutura") || "";
  const pendingStructure = demo && requestedStructure && requestedStructure !== draft.structure;

  useEffect(() => {
    let alive = true;
    (demo ? readStudy<Note[]>("notes", []) : api<Note[]>("/notes"))
      .then((data) => {
        if (alive) setNotes(data);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [demo]);
  useEffect(() => {
    let alive = true;
    readStudy<StudyImage[]>('atlas-inbox', []).then(items => {
      if (alive && items.length) {
        setDraft(d => ({ ...d, images: [...(d.images || []), ...items.filter(item => !d.images?.some(old => old.id === item.id))] }));
        setDirty(true);
      }
    }).catch(e => setError(e.message));
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FONT_KEY, JSON.stringify(type));
    } catch {
      /* Preferences are optional. */
    }
  }, [type]);
  useEffect(() => {
    if (!demo) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, images: [] }));
        setLocalState("Rascunho temporário nesta aba");
      } catch {
        setLocalState("Rascunho somente na tela — baixe uma cópia");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, demo]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const edit = (field: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setDirty(true);
    setStatus("");
  };
  const open = (note?: Note) => {
    setDraft(
      note
        ? { title: note.title, body: note.body, structure: note.structure, images: note.images || [] }
        : blank(requestedStructure),
    );
    setSelected(note?.id || "");
    setDirty(false);
    setError("");
    setStatus("");
    setConfirm(null);
  };
  const requestOpen = (note?: Note) => {
    if (dirty) setConfirm({ kind: "switch", note });
    else open(note);
  };
  const save = async () => {
    if (!draft.title.trim() || (!draft.body.trim() && !draft.images?.length)) return;
    setBusy(true);
    setError("");
    try {
      const note = demo ? { ...draft, id: selected || crypto.randomUUID(), updatedAt: new Date().toISOString() } : await api<Note>(
        "/notes" + (selected ? "/" + encodeURIComponent(selected) : ""),
        { method: selected ? "PUT" : "POST", body: JSON.stringify(draft) },
      );
      if (demo) {
        const current = await readStudy<Note[]>('notes', []);
        await writeStudy('notes', [note, ...current.filter(n => n.id !== note.id)]);
      }
      const inbox = await readStudy<StudyImage[]>('atlas-inbox', []);
      await writeStudy('atlas-inbox', inbox.filter(item => !draft.images?.some(image => image.id === item.id)));
      setNotes((n) => [note, ...n.filter((x) => x.id !== note.id)]);
      setSelected(note.id);
      setDirty(false);
      setStatus(demo ? "Anotação salva neste navegador." : "Anotação salva na sua conta.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    setBusy(true); setError('');
    try { await downloadNotePdf(draft); setStatus('PDF enviado para download.'); }
    catch { setError('Não foi possível gerar o PDF. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError(''); setImagesBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) throw Error('Escolha uma imagem PNG, JPG ou WebP de até 15 MB.');
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const item: StudyImage = { id: crypto.randomUUID(), image: canvas.toDataURL('image/jpeg', 0.92), title: file.name, parts: [], description: '' };
      setDraft(d => ({ ...d, images: [...(d.images || []), item] })); setDirty(true);
    } catch (e) { setError((e as Error).message); } finally { setImagesBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      if (demo) {
        const current = await readStudy<Note[]>('notes', []);
        await writeStudy('notes', current.filter(n => n.id !== selected));
      } else await api("/notes/" + encodeURIComponent(selected), { method: "DELETE" });
      setNotes((n) => n.filter((x) => x.id !== selected));
      open();
      setStatus("Anotação excluída.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const filtered = notes.filter((n) =>
    (n.title + " " + n.body + " " + n.structure)
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className={"journal-workspace" + (focus ? " journal-focus" : "")}>
      <header className="journal-heading">
        <div>
          <Brand /><p className="overline">CADERNO DE ESTUDO</p>
          <h1>
            Ideias que ficam<span>.</span>
          </h1>
          <p>Um espaço para observar, conectar e escrever.</p>
        </div>
        <Button
          variant="outline"
          className="journal-focus-toggle"
          onClick={() => setFocus(!focus)}
          aria-pressed={focus}
        >
          {focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          <span>{focus ? "Sair do foco" : "Modo foco"}</span>
        </Button>
      </header>
      {demo && (
        <div className="journal-demo-note">
          <NotebookPen size={18} />
          <p>
            <strong>Seu caderno neste navegador.</strong> Salve suas anotações para voltar depois e baixe um PDF para guardar uma cópia. Limpar os dados do navegador remove as anotações salvas.
          </p>
        </div>
      )}
      <div className="journal-layout">
        <aside className="journal-library" aria-label="Suas anotações">
          <div className="journal-library-heading">
            <BookOpen size={18} />
            <span>Anotações</span>
            <small>{String(notes.length).padStart(2, "0")}</small>
          </div>
          <Button className="button dark full" onClick={() => requestOpen()}>
            <Plus size={17} /> Nova anotação
          </Button>
          {(
            <div className="journal-search">
              <Search size={16} />
              <Input
                aria-label="Buscar no caderno"
                placeholder="Buscar uma ideia…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="journal-note-list">
            {(
              filtered.map((n) => (
                <button
                  key={n.id}
                  className={"journal-note-card" + (selected === n.id ? " is-current" : "")}
                  onClick={() => requestOpen(n)}
                >
                  <span className="journal-note-meta">
                    {new Date(n.updatedAt).toLocaleDateString("pt-BR")}
                    <FileText size={15} />
                  </span>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>{n.structure || "Anotação livre"}</small>
                </button>
              ))
            )}
            {!filtered.length && (
              <p className="journal-empty">
                {loading
                  ? "Carregando suas anotações…"
                  : search
                    ? "Nenhuma anotação encontrada."
                    : "Seu caderno começa com uma ideia. Crie sua primeira anotação."}
              </p>
            )}
          </div>
          <div className="journal-library-footer">
            <span>Viu no atlas?</span>
            <a href="/atlas">
              Transforme em uma conexão <ArrowUpRight size={16} />
            </a>
          </div>
        </aside>
        <section className="journal-desk" aria-label="Editor de anotações">
          <div className="journal-toolbar" aria-label="Tipografia da anotação">
            <Type size={19} className="journal-type-icon" />
            <div className="journal-font-control">
              <Label id="journal-font-label">Fonte</Label>
              <Select
                items={fonts}
                value={type.font}
                onValueChange={(v) => {
                  if (v) setType((t) => ({ ...t, font: v }));
                }}
              >
                <SelectTrigger aria-labelledby="journal-font-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {fonts.map((f) => (
                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="journal-size-control">
              <Label id="journal-size-label">Tamanho</Label>
              <Select
                items={sizes}
                value={type.size}
                onValueChange={(v) => {
                  if (v) setType((t) => ({ ...t, size: v }));
                }}
              >
                <SelectTrigger aria-labelledby="journal-size-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {sizes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="journal-toolbar-spacer" />
            {selected && (
              <Button
                variant="ghost"
                aria-label="Excluir anotação"
                className="journal-icon-button"
                onClick={() => setConfirm({ kind: "delete" })}
              >
                <Trash2 size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              className="journal-download"
              onClick={download}
              disabled={busy || (!draft.body.trim() && !draft.images?.length)}
            >
              <Download size={17} />
              <span>Baixar PDF</span>
            </Button>
          </div>
          <div
            className="journal-paper"
            style={
              {
                "--journal-font": font.family,
                "--journal-size": type.size / 16 + "rem",
              } as CSSProperties
            }
          >
            <div className="journal-paper-meta">
              <span>
                ANATOMED <i /> NOTAS & CONEXÕES
              </span>
              <span>{demo ? "RASCUNHO" : selected ? "ANOTAÇÃO" : "NOVA PÁGINA"}</span>
            </div>
            <Input
              className="journal-title"
              aria-label="Título da anotação"
              placeholder="Dê um título à sua ideia."
              value={draft.title}
              maxLength={150}
              onChange={(e) => edit("title", e.target.value)}
            />
            <div className="journal-subject">
              <Label id="journal-topic-label">Aba do resumo</Label>
              <Select
                items={topicItems}
                value={topicItems.some((item) => item.value === draft.structure) ? draft.structure : "__free__"}
                onValueChange={(value) => {
                  if (value === "__free__") edit("structure", "");
                  else if (value) edit("structure", value);
                }}
              >
                <SelectTrigger aria-labelledby="journal-topic-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {topicItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!topicItems.some((item) => item.value === draft.structure) && (
                <Input
                  id="journal-structure"
                  value={draft.structure}
                  maxLength={200}
                  placeholder="Nome da sua própria aba…"
                  onChange={(e) => edit("structure", e.target.value)}
                />
              )}
            </div>
            {pendingStructure && (
              <button
                className="journal-use-structure"
                onClick={() => edit("structure", requestedStructure)}
              >
                Usar assunto do atlas: {requestedStructure}
              </button>
            )}
            <div className="journal-media-tools">
              <Label className="button outline">{imagesBusy ? 'Carregando…' : 'Adicionar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={imagesBusy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></Label>
              <a className="button outline" href="/atlas">Selecionar partes no atlas 3D</a>
            </div>
            <Textarea
              ref={text}
              className="journal-body"
              aria-label="Texto da anotação"
              placeholder={
                "Comece pelo que você observou.\n\nO que essa estrutura faz? Como se conecta às outras? O que você ainda quer descobrir?"
              }
              maxLength={30000}
              value={draft.body}
              onChange={(e) => edit("body", e.target.value)}
            />
            <div className="study-image-list">{draft.images?.map(item => <figure key={item.id}>
              <img src={item.image} alt={item.title} />
              <figcaption><strong>{item.title}</strong>{item.parts.length > 0 && <p>{item.parts.join(', ')}</p>}<p>{item.description}</p></figcaption>
              <Button variant="ghost" onClick={() => { setDraft(d => ({ ...d, images: d.images?.filter(i => i.id !== item.id) })); setDirty(true); }} aria-label={'Remover imagem ' + item.title}><Trash2 size={16} /> Remover</Button>
            </figure>)}</div>
            <footer className="journal-paper-footer">
              <span>
                {count} {count === 1 ? "palavra" : "palavras"}
              </span>
              <span>
                {count
                  ? Math.max(1, Math.ceil(count / 200)) + " min de leitura"
                  : "Seu conhecimento, nas suas palavras."}
              </span>
            </footer>
          </div>
          <div className="journal-savebar">
            <span>
              <Check size={15} />
              {demo
                ? (dirty ? "Alterações não salvas" : selected ? "Salvo neste navegador" : localState)
                : dirty
                  ? "Alterações não salvas"
                  : selected
                    ? "Salvo na sua conta"
                    : "Nova anotação"}
            </span>
            <Button
              className="button dark"
              disabled={busy || !draft.title.trim() || (!draft.body.trim() && !draft.images?.length)}
              onClick={save}
            >
              {<Save size={17} />}{" "}
              {busy ? "Salvando…" : "Salvar anotação"}
            </Button>
          </div>
          {status && (
            <p className="journal-feedback" role="status">
              {status}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error} Seu texto continua no editor.
            </p>
          )}
          <StudyAssistant topic={draft.structure || "Anotação livre"} body={draft.body} />
        </section>
      </div>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "delete" ? "Excluir esta anotação?" : "Trocar de anotação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "delete"
                ? "Esta ação remove a anotação salva e não pode ser desfeita."
                : demo
                  ? "As alterações não salvas serão descartadas. Cancele e salve a anotação para guardá-la."
                  : "As alterações que ainda não foram salvas serão descartadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => (confirm?.kind === "delete" ? void remove() : open(confirm?.note))}
            >
              {confirm?.kind === "delete" ? "Excluir anotação" : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
