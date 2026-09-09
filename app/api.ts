export type User = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "student" | "teacher";
  access: "active" | "pending" | "blocked";
};
export type Session = { user: User | null; authConfigured: boolean; ownerLogin: boolean; settings: Settings };
export type Settings = { price: number; checkoutUrl: string; supportEmail: string; headline: string; offerEnabled: boolean };
export const defaults: Settings = { price: 19.9, checkoutUrl: "", supportEmail: "", headline: "Anatomia que você vê. Conhecimento que fica.", offerEnabled: true };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
const SESSION_KEY = "anatomed-supabase-session-v1";

type AuthUser = { id: string; email?: string; user_metadata?: { name?: string; role?: string } };
type AuthSession = { access_token: string; refresh_token?: string; expires_at?: number; user: AuthUser };

function storedSession(): AuthSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as AuthSession | null; } catch { return null; }
}
function saveSession(value: AuthSession | null) {
  try { if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value)); else localStorage.removeItem(SESSION_KEY); } catch { /* Storage is optional. */ }
}
async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}
function errorMessage(data: unknown) {
  if (data && typeof data === "object") {
    if ("msg" in data && typeof data.msg === "string") return data.msg;
    if ("message" in data && typeof data.message === "string") return data.message;
    if ("error_description" in data && typeof data.error_description === "string") return data.error_description;
    if ("error" in data && typeof data.error === "string") return data.error;
  }
  return "Não foi possível concluir esta ação.";
}
async function supabaseRequest(path: string, options: RequestInit = {}, token?: string) {
  if (!authConfigured) throw Error("O Supabase ainda não foi configurado.");
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await readResponse(response);
  if (!response.ok) throw Error(errorMessage(data));
  return data;
}
async function authRequest(path: string, options: RequestInit = {}, token?: string) {
  return supabaseRequest(`/auth/v1${path}`, options, token || SUPABASE_KEY);
}
async function restRequest(path: string, options: RequestInit = {}, token?: string) {
  return supabaseRequest(`/rest/v1/${path}`, options, token);
}
function profileToUser(profile: Record<string, unknown>, authUser: AuthUser): User {
  const role = profile.role === "owner" || profile.role === "teacher" ? profile.role : "student";
  const access = profile.access === "pending" || profile.access === "blocked" ? profile.access : "active";
  return { id: authUser.id, name: String(profile.name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Estudante"), email: authUser.email || "", role, access };
}
async function ensureProfile(authUser: AuthUser, token: string): Promise<User> {
  const rows = await restRequest(`profiles?id=eq.${encodeURIComponent(authUser.id)}&select=*`, {}, token) as Record<string, unknown>[];
  if (rows[0]) return profileToUser(rows[0], authUser);
  const inserted = await restRequest("profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ id: authUser.id, name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "", role: authUser.user_metadata?.role || "student", access: "active" }),
  }, token) as Record<string, unknown>[];
  return profileToUser(inserted[0] || {}, authUser);
}
async function remoteSession(): Promise<Session> {
  const current = storedSession();
  if (!current?.access_token) return { user: null, authConfigured: true, ownerLogin: false, settings: defaults };
  try {
    const authUser = await authRequest("/user", { method: "GET" }, current.access_token) as AuthUser;
    const user = await ensureProfile(authUser, current.access_token);
    return { user, authConfigured: true, ownerLogin: user.role === "owner", settings: defaults };
  } catch {
    saveSession(null);
    return { user: null, authConfigured: true, ownerLogin: false, settings: defaults };
  }
}
function noteFromRow(row: Record<string, unknown>) {
  return { id: String(row.id), title: String(row.title || ""), body: String(row.body || ""), structure: String(row.structure || ""), images: Array.isArray(row.images) ? row.images : [], updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()) };
}
function summaryFromRow(row: Record<string, unknown>) {
  return { id: String(row.summary_id), title: String(row.title || ""), body: String(row.body || ""), images: Array.isArray(row.images) ? row.images : [] };
}
async function remoteApi(path: string, options: RequestInit) {
  const current = storedSession();
  const body = options.body ? JSON.parse(String(options.body)) as Record<string, any> : {};
  if (path === "/session") return remoteSession();
  if (path === "/auth/login" && options.method === "POST") {
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const email = rawEmail === "mayne" ? "mayne@anatomed.com" : rawEmail === "demo" || rawEmail === "juan" ? "demo@anatomed.com" : rawEmail;
    const login = await authRequest("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password: body.password }) }) as AuthSession;
    saveSession(login);
    const user = await ensureProfile(login.user, login.access_token);
    return { user, authConfigured: true, ownerLogin: user.role === "owner", settings: defaults };
  }
  if (path === "/auth/signup" && options.method === "POST") {
    const result = await authRequest("/signup", { method: "POST", body: JSON.stringify({ email: body.email, password: body.password, data: { name: body.name, role: body.role || "student" } }) }) as Partial<AuthSession> & { user?: AuthUser };
    if (result.access_token && result.user) {
      saveSession(result as AuthSession);
      const user = await ensureProfile(result.user, result.access_token);
      return { user, authConfigured: true, ownerLogin: user.role === "owner", settings: defaults };
    }
    return { message: "Conta criada. Confira seu e-mail para confirmar o acesso." };
  }
  if (path === "/auth/recover" && options.method === "POST") {
    await authRequest("/recover", { method: "POST", body: JSON.stringify({ email: body.email, redirect_to: `${location.origin}/acesso/confirmar` }) });
    return { message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação." };
  }
  if (path === "/auth/logout" && options.method === "POST") {
    if (current?.access_token) await authRequest("/logout", { method: "POST" }, current.access_token);
    saveSession(null); return { ok: true };
  }
  if (path === "/auth/finish" && options.method === "POST") {
    const accessToken = String(body.access_token || "");
    const authUser = await authRequest("/user", { method: "GET" }, accessToken) as AuthUser;
    saveSession({ access_token: accessToken, refresh_token: String(body.refresh_token || ""), user: authUser });
    return { ok: true };
  }
  if (path === "/auth/password" && options.method === "POST") {
    if (!current?.access_token) throw Error("Sua sessão expirou. Entre novamente.");
    await authRequest("/user", { method: "PUT", body: JSON.stringify({ password: body.password }) }, current.access_token);
    return { ok: true };
  }
  if (!current?.access_token) throw Error("Entre na sua conta para continuar.");
  if (path === "/notes" && (!options.method || options.method === "GET")) {
    const rows = await restRequest("study_notes?select=*&order=updated_at.desc", {}, current.access_token) as Record<string, unknown>[];
    return rows.map(noteFromRow);
  }
  if (path === "/notes" && options.method === "POST") {
    const rows = await restRequest("study_notes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: current.user.id, title: body.title, body: body.body || "", structure: body.structure || "", images: body.images || [] }) }, current.access_token) as Record<string, unknown>[];
    return noteFromRow(rows[0]);
  }
  if (path.startsWith("/notes/") && options.method === "PUT") {
    const id = encodeURIComponent(path.slice("/notes/".length));
    const rows = await restRequest(`study_notes?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: body.title, body: body.body || "", structure: body.structure || "", images: body.images || [], updated_at: new Date().toISOString() }) }, current.access_token) as Record<string, unknown>[];
    return noteFromRow(rows[0]);
  }
  if (path.startsWith("/notes/") && options.method === "DELETE") {
    const id = encodeURIComponent(path.slice("/notes/".length));
    await restRequest(`study_notes?id=eq.${id}`, { method: "DELETE" }, current.access_token); return { ok: true };
  }
  if (path === "/summaries" && (!options.method || options.method === "GET")) {
    const rows = await restRequest("study_summaries?select=*&order=updated_at.asc", {}, current.access_token) as Record<string, unknown>[];
    return rows.map(summaryFromRow);
  }
  if (path === "/summaries" && options.method === "PUT") {
    const summaries = Array.isArray(body.summaries) ? body.summaries : [];
    const rows = await restRequest("study_summaries?on_conflict=user_id,summary_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(summaries.map((item: any) => ({ user_id: current.user.id, summary_id: item.id, title: item.title, body: item.body || "", images: item.images || [], updated_at: new Date().toISOString() }))) }, current.access_token) as Record<string, unknown>[];
    return rows.map(summaryFromRow);
  }
  throw Error("Ação não suportada.");
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (authConfigured) return await remoteApi(path, options) as T;
  const response = await fetch("/api" + path, { credentials: "same-origin", ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await readResponse(response);
  if (!response.ok) throw Error(errorMessage(data));
  return data as T;
}
export const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

