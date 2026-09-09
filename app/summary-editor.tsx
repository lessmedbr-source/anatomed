import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Brand } from './brand';
import { lessons, textbook } from './study-content';
import { readTabs, readStudy, writeStudy, defaultTabs, type SummaryTab } from './study-store';
import { api } from './api';
export default function SummaryEditor({ demo = false }: { demo?: boolean }) {
  const [tabs, setTabs] = useState<SummaryTab[]>([]), [selected, setSelected] = useState(''), [name, setName] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => { (demo ? readTabs() : api<SummaryTab[]>('/summaries').then(items => items.length ? items : defaultTabs())).then(async items => {
    const id = new URLSearchParams(location.search).get('sistema') || await readStudy('selected-summary', items[0]?.id);
    setTabs(items); setSelected(items.some(t => t.id === id) ? id : items[0]?.id);
  }).catch(e => setMessage(e.message)); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function persist(next: SummaryTab[]) {
    setBusy(true); setMessage('');
    try { if (demo) await writeStudy('summaries', next); else await api('/summaries', { method: 'PUT', body: JSON.stringify({ summaries: next }) }); setTabs(next); setDirty(false); setMessage(demo ? 'Resumos salvos neste navegador.' : 'Resumos salvos na sua conta.'); return true; }
    catch (e) { setMessage((e as Error).message); return false; }
    finally { setBusy(false); }
  }
  async function select(id: string) {
    if (dirty && !await persist(tabs)) return;
    try { await writeStudy('selected-summary', id); setSelected(id); } catch (e) { setMessage((e as Error).message); }
  }
  async function create() {
    if (!name.trim()) return;
    const tab = { id: crypto.randomUUID(), title: name.trim(), body: '', images: [] };
    if (await persist([...tabs, tab])) { setName(''); setSelected(tab.id); try { await writeStudy('selected-summary', tab.id); } catch (e) { setMessage((e as Error).message); } }
  }
  async function move(index: number, delta: number) {
    const next = [...tabs]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; await persist(next);
  }
  const tab = tabs.find(t => t.id === selected), lesson = lessons.find(l => l.id === selected);
  return <div className="workspace-content">
    <div className="page-heading"><Brand /><p className="overline">SEUS RESUMOS</p><h1>Conecte o que você aprendeu.</h1><p>Organize suas abas e reúna observações e estruturas do atlas.</p></div>
    <div className="summary-layout">
      <nav className="summary-nav" aria-label="Abas de resumo">
        {tabs.map((t, i) => <div className="summary-tab-row" key={t.id}>
          <button className={selected === t.id ? 'active' : ''} onClick={() => void select(t.id)} disabled={busy} aria-current={selected === t.id ? 'page' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{t.title}</button>
          <div><Button variant="ghost" size="icon" disabled={busy || i === 0} aria-label={'Mover ' + t.title + ' para cima'} onClick={() => void move(i, -1)}><ArrowUp size={15} /></Button><Button variant="ghost" size="icon" disabled={busy || i === tabs.length - 1} aria-label={'Mover ' + t.title + ' para baixo'} onClick={() => void move(i, 1)}><ArrowDown size={15} /></Button></div>
        </div>)}
        <form className="summary-new" onSubmit={e => { e.preventDefault(); void create(); }}><Input aria-label="Nome da nova aba de resumo" placeholder="Nome da nova aba" value={name} maxLength={100} onChange={e => setName(e.target.value)} /><Button disabled={busy || !name.trim()}><Plus size={16} /> Nova aba</Button></form>
      </nav>
      {tab && <article className="summary-article">
        <p className="overline">ANATOMED / {String(tabs.indexOf(tab) + 1).padStart(2, '0')}</p><h2>{tab.title}</h2>
        {lesson && <><p className="summary-intro">{lesson.intro}</p><h3>Guarde estas ideias</h3><ol>{lesson.points.map((p, i) => <li key={p}><span>{i + 1}</span><p>{p}</p></li>)}</ol><div className="study-prompt"><div><h3>Experimente no atlas</h3><p>{lesson.task}</p></div></div></>}
        <label htmlFor="summary-body">Minhas observações</label><Textarea id="summary-body" className="summary-writing" value={tab.body} placeholder="Escreva sua síntese…" maxLength={30000} onChange={e => { setTabs(tabs.map(t => t.id === selected ? { ...t, body: e.target.value } : t)); setDirty(true); }} />
        <div className="summary-actions"><Button disabled={busy} onClick={() => void persist(tabs)}><Save size={16} /> Salvar resumo</Button><a className="button outline" href={'/atlas' + (lesson ? '?sistema=' + lesson.id : '')} onClick={async e => { e.preventDefault(); if (await persist(tabs)) { await writeStudy('selected-summary', tab.id); location.assign('/atlas' + (lesson ? '?sistema=' + lesson.id : '')); } }}>Adicionar partes do atlas 3D</a></div>
        <div className="study-image-list">{tab.images.map(item => <figure key={item.id}><img src={item.image} alt={item.title} /><figcaption><h3>{item.title}</h3><p>{item.parts.join(', ')}</p><p>{item.description}</p><small>BodyParts3D · DBCLS · CC BY 4.0</small></figcaption><Button variant="ghost" disabled={busy} onClick={() => void persist(tabs.map(t => t.id === selected ? { ...t, images: t.images.filter(i => i.id !== item.id) } : t))}><Trash2 size={15} /> Remover do resumo</Button></figure>)}</div>
        {lesson && <footer className="lesson-source">Leitura de apoio: <a href={textbook(lesson.chapter)} target="_blank" rel="noreferrer">OpenStax · Anatomy and Physiology 2e</a>.</footer>}
      </article>}
    </div><p role="status">{message || (dirty ? 'Alterações não salvas.' : '')}</p>
  </div>;
}

