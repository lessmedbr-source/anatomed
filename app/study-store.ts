import { lessons } from './study-content';
export type StudyImage = { id: string; title: string; image: string; parts: string[]; description: string };
export type SummaryTab = { id: string; title: string; body: string; images: StudyImage[] };
export type StudyNote = { id: string; title: string; body: string; structure: string; updatedAt: string; images?: StudyImage[] };
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('anatomed-study', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('study');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = undefined; reject(Error('Não foi possível abrir o armazenamento deste navegador.')); };
  });
}
export async function readStudy<T>(key: string, fallback: T): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('study').objectStore('study').get(key);
    request.onsuccess = () => resolve(request.result ?? fallback);
    request.onerror = () => reject(request.error);
  });
}
export async function writeStudy(key: string, value: unknown) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('study', 'readwrite');
    transaction.objectStore('study').put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(Error('Não foi possível salvar. Verifique o espaço disponível no navegador.'));
    transaction.onabort = () => reject(Error('O salvamento foi interrompido. Tente novamente.'));
  });
}
export const defaultTabs = (): SummaryTab[] => lessons.map(l => ({ id: l.id, title: l.title, body: '', images: [] }));
export async function readTabs() { return readStudy('summaries', defaultTabs()); }
export async function captureAtlas(): Promise<string> {
  return new Promise((resolve, reject) => {
    window.dispatchEvent(new CustomEvent('anatomed-capture', { detail: { resolve, reject } }));
    setTimeout(() => reject(Error('Aguarde o atlas terminar de carregar e tente novamente.')), 3000);
  });
}
