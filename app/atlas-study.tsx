import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { captureAtlas, readTabs, readStudy, writeStudy, type SummaryTab, type StudyImage } from './study-store';
export default function AtlasStudy({ title, parts, description, ready }: { title: string; parts: string[]; description: string; ready: boolean }) {
  const [tabs, setTabs] = useState<SummaryTab[]>([]), [target, setTarget] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { readTabs().then(async items => { setTabs(items); const active = await readStudy('selected-summary', items[0]?.id); setTarget(items.some(t => t.id === active) ? active : items[0]?.id); }).catch(e => setMessage(e.message)); }, []);
  async function add(destination: 'note' | 'summary') {
    setBusy(true); setMessage('');
    try {
      const item: StudyImage = { id: crypto.randomUUID(), title, parts, description, image: await captureAtlas() };
      if (destination === 'note') {
        const queue = await readStudy<StudyImage[]>('atlas-inbox', []);
        await writeStudy('atlas-inbox', [...queue, item]);
        location.assign('/caderno?estrutura=' + encodeURIComponent(title));
      } else {
        const current = await readTabs();
        if (!current.some(t => t.id === target)) throw Error('Escolha uma aba de resumo.');
        await writeStudy('summaries', current.map(t => t.id === target ? { ...t, images: [...t.images, item] } : t));
        await writeStudy('selected-summary', target);
        setMessage('Estrutura e imagem adicionadas ao resumo.');
      }
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="atlas-study-transfer">
    <Button disabled={!ready || busy} onClick={() => void add('note')}>Adicionar imagem e peças ao caderno</Button>
    <label id="atlas-summary-target">Adicionar ao resumo</label>
    <Select items={tabs.map(t => ({ value: t.id, label: t.title }))} value={target} onValueChange={v => v && setTarget(v)}>
      <SelectTrigger aria-labelledby="atlas-summary-target"><SelectValue /></SelectTrigger>
      <SelectContent>{tabs.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
    </Select>
    <Button variant="outline" disabled={!ready || busy || !target} onClick={() => void add('summary')}>{busy ? 'Adicionando…' : 'Adicionar ao resumo selecionado'}</Button>
    {message && <p role="status">{message} <a href={'/resumos?sistema=' + target}>Abrir resumo</a></p>}
  </div>;
}
