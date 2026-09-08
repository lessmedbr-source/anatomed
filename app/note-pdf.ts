import type { StudyNote } from './study-store';
// Render text with the browser's fonts, including Portuguese accents, into A4 pages.
export async function downloadNotePdf(note: Pick<StudyNote, 'title' | 'body' | 'structure' | 'images'>) {
  const pages: Uint8Array[] = [];
  const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext('2d')!;
  let y = 0;
  function start() {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = '#111'; ctx.fillRect(80, 65, 58, 58);
    ctx.font = 'bold 48px Georgia'; ctx.fillStyle = '#fff'; ctx.fillText('a', 95, 110);
    ctx.fillStyle = '#111'; ctx.font = 'bold 40px Arial'; ctx.fillText('anatomed.', 154, 110);
    ctx.font = '20px Arial'; ctx.fillText('CADERNO DE ESTUDO', 80, 165);
    ctx.fillRect(80, 188, 1080, 2); y = 245;
  }
  function finish() {
    ctx.fillStyle = '#555'; ctx.font = '18px Arial';
    ctx.fillText('Anatomed · Notas & conexões', 80, 1680); ctx.fillText(String(pages.length + 1), 1120, 1680);
    pages.push(Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]), c => c.charCodeAt(0)));
  }
  function line(text: string, size: number, bold = false) {
    if (y + size * 1.5 > 1610) { finish(); start(); }
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${bold ? 'Arial' : 'Georgia'}`;
    ctx.fillStyle = '#111'; ctx.fillText(text, 80, y); y += size * 1.5;
  }
  function paragraph(text: string, size = 27, bold = false) {
    for (const raw of text.split('\n')) {
      let row = '';
      for (const word of raw.split(/\s+/)) {
        // Break oversized tokens too, so pasted links cannot overflow the page.
        for (const fragment of word.match(/.{1,55}/gu) || ['']) {
          ctx.font = `${bold ? 'bold ' : ''}${size}px ${bold ? 'Arial' : 'Georgia'}`;
          if (row && ctx.measureText(row + ' ' + fragment).width > 1080) { line(row, size, bold); row = fragment; }
          else row += (row ? ' ' : '') + fragment;
        }
      }
      line(row, size, bold);
    }
    y += 16;
  }
  start(); paragraph(note.title || 'Anotação Anatomed', 44, true);
  if (note.structure) paragraph(note.structure, 23, true);
  paragraph(note.body);
  for (const item of note.images || []) {
    const image = new Image(); image.src = item.image; await image.decode();
    const height = Math.min(720, 1080 * image.height / image.width);
    if (y + height + 130 > 1610) { finish(); start(); }
    paragraph(item.title, 28, true);
    const width = height * image.width / image.height;
    ctx.drawImage(image, 80 + (1080 - width) / 2, y, width, height); y += height + 40;
    if (item.parts.length) paragraph('Estruturas: ' + item.parts.join(', '), 22);
    if (item.description) paragraph(item.description, 22);
    if (item.parts.length) paragraph('Atlas: BodyParts3D · DBCLS · CC BY 4.0', 18);
  }
  finish();
  const encoder = new TextEncoder(), chunks: Uint8Array[] = [], offsets: number[] = [0]; let length = 0;
  const push = (value: string | Uint8Array) => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, body: string) => { offsets[id] = length; push(`${id} 0 obj\n${body}\nendobj\n`); };
  push('%PDF-1.4\n'); object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
  pages.forEach((bytes, i) => {
    const id = 3 + i * 3;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    offsets[id + 1] = length;
    push(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); push(bytes); push('\nendstream\nendobj\n');
    const commands = 'q 595.28 0 0 841.89 0 0 cm /Im Do Q';
    object(id + 2, `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
  });
  const xref = length; push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'application/pdf' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = (note.title || 'anotacao-anatomed').replace(/[<>:"/\\|?*]/g, '').slice(0, 80) + '.pdf'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
