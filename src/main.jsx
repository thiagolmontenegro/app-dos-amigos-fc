import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

const env = import.meta?.env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://tvouiuulgqoutyvievui.supabase.co";
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2b3VpdXVsZ3FvdXR5dmlldnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjg4MjQsImV4cCI6MjA5MjYwNDgyNH0.0acxFA68_taheBcIq-y4bmyumxhvFV3amiVulQPavhI";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APP_ICON_SRC = "/icons/icon-192.png";
const SUPER_ADMIN_EMAIL = String(env.VITE_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

const statusList = [
  ["pendente", "Pendente"],
  ["jogo", "Jogo"],
  ["jogo_resenha", "Jogo + Resenha"],
  ["resenha", "Só Resenha"],
  ["nao_vou", "Não vou"],
];

const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-400 disabled:opacity-70";
const btnCls = "rounded-xl px-4 py-2 font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98]";

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`${btnCls} ${className}`}>{children}</button>;
}

function Box({ title, children, className = "" }) {
  return <section className={`bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl p-5 space-y-4 ${className}`}><h2 className="text-xl font-black text-white">{title}</h2>{children}</section>;
}

function Field({ label, children }) {
  return <label className="text-sm text-zinc-400 space-y-1 block"><span>{label}</span>{children}</label>;
}

function StatCard({ label, value, tone = "bg-zinc-800" }) {
  return <div className={`${tone} rounded-2xl p-4 border border-zinc-700/40`}><p className="text-xs text-zinc-400">{label}</p><b className="text-2xl text-white">{value}</b></div>;
}

function displayName(player) {
  return player?.nickname?.trim() ? player.nickname : player?.name || "";
}

function isGame(p) {
  return p?.status === "jogo" || p?.status === "jogo_resenha";
}

function money(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
}

function brDateFromInput(d) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");
}

function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `(${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} - ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;
}

function statusEmoji(p) {
  if (p?.status === "jogo_resenha") return "🍖⚽";
  if (p?.status === "jogo") return "⚽";
  if (p?.status === "resenha") return "🍖";
  return "";
}

function shuffle(a) {
  return [...a].map((item) => ({ item, r: Math.random() })).sort((x, y) => x.r - y.r).map((x) => x.item);
}

function teamTag(name) {
  const v = String(name || "").toLowerCase();
  if (v.includes("azul")) return { short: "AZU", color: "bg-blue-600" };
  if (v.includes("laranja")) return { short: "LAR", color: "bg-orange-500" };
  if (v.includes("sem") || v.includes("colete")) return { short: "S/COL", color: "bg-zinc-500" };
  return { short: String(name || "TIM").slice(0, 3).toUpperCase(), color: "bg-zinc-700" };
}

async function dbCall(fn) {
  try {
    const res = await fn();
    if (res?.error) return { error: res.error };
    return res;
  } catch (e) {
    return { error: e };
  }
}

function AppDosAmigosFC() {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({ name: "", nickname: "", email: "", tempPassword: "", level: 3, position: "Linha" });
  const [editId, setEditId] = useState(null);
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("admin");
  const [hide, setHide] = useState(false);

  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", nickname: "", email: "", password: "", position: "Linha" });
  const [authMsg, setAuthMsg] = useState("");
  const [rememberLogin, setRememberLogin] = useState(() => localStorage.getItem("afc_remember_login") === "true");
  const [newPassword, setNewPassword] = useState("");
  const [firstAccessMsg, setFirstAccessMsg] = useState("");

  const [dbMsg, setDbMsg] = useState("Conectando ao banco...");
  const [notice, setNotice] = useState("");
  const [liveEvents, setLiveEvents] = useState([]);
  const [smartNotifications, setSmartNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securitySearch, setSecuritySearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState("Todas");
  const [deadlineAlertSent, setDeadlineAlertSent] = useState(false);
  const [deadlineExpiredAlertSent, setDeadlineExpiredAlertSent] = useState(false);
  const [pushStatus, setPushStatus] = useState("desativado");

  const [playerSearch, setPlayerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [listActive, setListActive] = useState(false);
  const [listLocked, setListLocked] = useState(false);
  const [gameClosed, setGameClosed] = useState(false);
  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [gameTime, setGameTime] = useState("20:00");
  const [gameLocation, setGameLocation] = useState("");
  const [listDeadline, setListDeadline] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState(["Azul", "Laranja", "Sem colete"]);
  const [teams, setTeams] = useState(null);
  const [initial, setInitial] = useState([]);

  const [price, setPrice] = useState(15);
  const [pay, setPay] = useState({});
  const [cashBalance, setCashBalance] = useState(0);
  const [cashMovements, setCashMovements] = useState([]);
  const [cashForm, setCashForm] = useState({ type: "entrada", amount: "", description: "" });

  const [games, setGames] = useState([{ id: "1", a: 0, b: 1, sa: 0, sb: 0, goals: [], assists: [], fa: "", fb: "", aa: "", ab: "", ca: false, cb: false }]);
  const [mvp, setMvp] = useState("");
  const [showMvpCalc, setShowMvpCalc] = useState(false);
  const [savedMatches, setSavedMatches] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const isSuperAdmin = String(user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

  const currentPlayer = useMemo(() => {
    if (!user) return null;
    const email = String(user.email || "").trim().toLowerCase();
    return players.find((p) => String(p.user_id || "") === String(user.id)) || players.find((p) => String(p.email || "").trim().toLowerCase() === email) || null;
  }, [players, user]);

  const isAdmin = isSuperAdmin || currentPlayer?.role === "admin";
  const isFinanceResponsible = !!currentPlayer?.finance_responsible;
  const canAccessCash = isAdmin || isFinanceResponsible;
  const effectiveMode = isAdmin ? mode : "atleta";
  const loggedPlayerName = currentPlayer ? displayName(currentPlayer) : isSuperAdmin ? "SUPER ADMIN" : "Cadastro não vinculado";

  const activeLine = useMemo(() => players.filter((p) => isGame(p) && p.position !== "Goleiro").sort((a, b) => (a.updated_at || 0) - (b.updated_at || 0)), [players]);
  const activeGoalkeepers = useMemo(() => players.filter((p) => isGame(p) && p.position === "Goleiro").sort((a, b) => (a.updated_at || 0) - (b.updated_at || 0)), [players]);
  const mainSlotPlayers = useMemo(() => Array.from({ length: 14 }).map((_, i) => i < 2 ? activeGoalkeepers[i] : activeLine[i - 2]), [activeGoalkeepers, activeLine]);

  const mainGamePlayers = mainSlotPlayers.filter(Boolean);
  const reserveList = [...activeGoalkeepers.slice(2), ...activeLine.slice(12)];
  const resenhaOnly = players.filter((p) => p.status === "resenha").sort((a, b) => displayName(a).localeCompare(displayName(b), "pt-BR"));
  const absentList = players.filter((p) => p.status === "nao_vou").sort((a, b) => displayName(a).localeCompare(displayName(b), "pt-BR"));
  const mainPayers = mainGamePlayers.filter((p) => p.position !== "Goleiro");
  const expected = mainPayers.length * Number(price || 0);
  const paid = mainPayers.filter((p) => pay[p.id]).length * Number(price || 0);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => displayName(a).localeCompare(displayName(b), "pt-BR")), [players]);
  const visiblePlayers = sortedPlayers.filter((p) => {
    const matchSearch = `${p.name} ${p.nickname || ""}`.toLowerCase().includes(playerSearch.toLowerCase());
    const matchStatus = screen === "players" || statusFilter === "todos" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const listDeadlineMs = listDeadline ? new Date(listDeadline).getTime() : null;
  const listExpired = !!(listActive && listDeadlineMs && nowTick > listDeadlineMs);
  const listCanReceiveStatus = listActive && !listLocked && !listExpired;

  function formatCountdown() {
    if (!listActive) return "Nenhuma lista ativa";
    if (!listDeadlineMs) return "Sem prazo definido";
    const diff = listDeadlineMs - nowTick;
    if (diff <= 0) return "Tempo encerrado";
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}min`;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function notifyListChange(message) {
    setNotice(message);
    setLiveEvents((prev) => [{ id: Date.now(), message, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
    setTimeout(() => setNotice(""), 3500);
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification("App dos Amigos FC", { body: message });
    } catch {}
  }

  async function loadSmartNotifications() {
    const { data, error } = await supabase
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) setSmartNotifications(data || []);
  }

  async function createSmartNotification(message, type = "info", audience = "all") {
    notifyListChange(message);

    const item = {
      id: Date.now(),
      message,
      type,
      audience,
      created_at: new Date().toISOString(),
      created_by: user?.email || "",
    };

    setSmartNotifications((prev) => [item, ...prev].slice(0, 20));

    await dbCall(() => supabase.from("app_notifications").insert({
      message,
      type,
      audience,
      created_by: user?.email || "",
    }));
  }

  async function clearSmartNotifications() {
    if (!isAdmin) return notifyListChange("Somente Admin pode limpar as notificações.");
    if (!window.confirm("Limpar todo o histórico de notificações?")) return;

    const { error } = await supabase.from("app_notifications").delete().neq("id", 0);
    if (error) return notifyListChange("Erro ao limpar notificações: " + error.message);

    setSmartNotifications([]);
    notifyListChange("Notificações limpas.");
  }


  async function loadAuditLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) setAuditLogs(data || []);
  }

  async function createAuditLog(action, details = {}) {
    try {
      await supabase.from("audit_logs").insert({
        action,
        details,
        actor_email: user?.email || "",
        actor_player_id: currentPlayer?.id || null,
      });
    } catch {}
  }

  async function loadPlayersFromDb() {
    const { data, error } = await supabase.from("players").select("*").order("name");
    if (error) {
      setDbMsg(error.message || "Erro ao carregar jogadores do banco");
      return [];
    }
    const mapped = (data || []).map((p) => ({
      id: String(p.id),
      name: String(p.name || "").toUpperCase(),
      nickname: String(p.nickname || "").toUpperCase(),
      level: Number(p.level || 3),
      position: p.position || "Linha",
      status: p.status || "pendente",
      user_id: p.user_id || null,
      email: String(p.email || "").trim().toLowerCase(),
      role: p.role || "athlete",
      approved: p.approved !== false,
      updated_at: p.updated_at || 0,
      must_change_password: !!p.must_change_password,
      first_access_done: !!p.first_access_done,
      temp_password_created: !!p.temp_password_created,
      finance_responsible: !!p.finance_responsible,
    }));
    setPlayers(mapped);
    setDbMsg("Banco conectado");
    return mapped;
  }

  async function loadSavedMatches() {
    const { data, error } = await supabase
      .from("app_games")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setSavedMatches(data || []);
  }

  async function loadCashMovements() {
    const { data, error } = await supabase
      .from("cash_movements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setCashMovements(data || []);
  }

  async function loadAll() {
    await loadPlayersFromDb();

    const [settingsRes, paymentsRes] = await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("payments").select("*"),
    ]);

    if (settingsRes.data) {
      setTeamCount(Number(settingsRes.data.team_count || 2));
      setTeamNames(settingsRes.data.team_names || ["Azul", "Laranja", "Sem colete"]);
      setPrice(Number(settingsRes.data.price || 15));
      setListActive(!!settingsRes.data.list_active);
      setListLocked(!!settingsRes.data.list_locked);
      setGameClosed(!!settingsRes.data.game_closed);
      setGameTime(settingsRes.data.game_time || "20:00");
      setGameLocation(settingsRes.data.game_location || "");
      setCashBalance(Number(settingsRes.data.cash_balance || 0));
      setListDeadline(settingsRes.data.list_deadline || "");
    }

    const paymentMap = {};
    (paymentsRes.data || []).forEach((p) => { paymentMap[String(p.player_id)] = !!p.paid; });
    setPay(paymentMap);
    await loadSavedMatches();
    await loadCashMovements();
    await loadSmartNotifications();
    if (isAdmin) await loadAuditLogs();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => authSub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!listActive || !listDeadlineMs) return;

    const diff = listDeadlineMs - nowTick;

    if (diff > 0 && diff <= 30 * 60 * 1000 && !deadlineAlertSent) {
      setDeadlineAlertSent(true);
      createSmartNotification("⏰ A lista fecha em menos de 30 minutos.", "deadline", "all");
    }

    if (diff <= 0 && !deadlineExpiredAlertSent) {
      setDeadlineExpiredAlertSent(true);
      createSmartNotification("⛔ O prazo da lista encerrou.", "deadline_expired", "all");
    }
  }, [nowTick, listActive, listDeadlineMs, deadlineAlertSent, deadlineExpiredAlertSent]);

  useEffect(() => {
    const channel = supabase
      .channel("amigosfc-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, async (payload) => {
        await loadPlayersFromDb();
        const row = payload.new || payload.old || {};
        const nome = displayName(row) || row.email || "Atleta";
        if (payload.eventType === "INSERT") notifyListChange(`${nome} entrou no sistema.`);
        if (payload.eventType === "UPDATE") notifyListChange(`${nome} teve dados/status atualizados.`);
        if (payload.eventType === "DELETE") notifyListChange(`${nome} foi removido.`);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, async () => {
        await loadAll();
        notifyListChange("Configurações da lista atualizadas.");
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    async function autoLink() {
      if (!user || !players.length) return;
      const email = String(user.email || "").trim().toLowerCase();
      const player = players.find((p) => String(p.user_id || "") === String(user.id)) || players.find((p) => String(p.email || "").trim().toLowerCase() === email);
      if (!player || player.user_id) return;
      await supabase.from("players").upsert({ ...player, user_id: user.id, email });
      await loadPlayersFromDb();
    }
    autoLink();
  }, [user, players.length]);


  useEffect(() => {
    const savedEmail = localStorage.getItem("afc_saved_email") || "";
    if (savedEmail) {
      setAuthForm((prev) => ({ ...prev, email: savedEmail }));
    }
  }, []);

  function updateRememberLogin(value) {
    setRememberLogin(value);
    if (!value) {
      localStorage.removeItem("afc_remember_login");
      localStorage.removeItem("afc_saved_email");
    }
  }

  function saveRememberedLogin() {
    const email = String(authForm.email || "").trim().toLowerCase();
    if (rememberLogin && email) {
      localStorage.setItem("afc_remember_login", "true");
      localStorage.setItem("afc_saved_email", email);
    } else {
      localStorage.removeItem("afc_remember_login");
      localStorage.removeItem("afc_saved_email");
    }
  }

  async function signIn() {
    setAuthMsg("");
    const email = authForm.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: authForm.password });
    if (error) return setAuthMsg(error.message);
    saveRememberedLogin();
    setUser(data.user);
    await loadAll();
  }

  async function signUp() {
    setAuthMsg("");

    const name = authForm.name.trim().toUpperCase();
    const nickname = authForm.nickname.trim().toUpperCase();
    const email = authForm.email.trim().toLowerCase();

    if (!name || !email || !authForm.password) {
      return setAuthMsg("Preencha nome, e-mail e senha.");
    }

    const finalNickname = nickname || name;

    const createOrUpdatePlayer = async (userId) => {
      const { data: existing } = await supabase
        .from("players")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      const playerData = {
        id: existing?.id || String(Date.now()),
        name,
        nickname: finalNickname,
        email,
        user_id: userId,
        level: existing?.level || 3,
        position: existing?.position || authForm.position,
        status: existing?.status || "pendente",
        role: existing?.role || "athlete",
        approved: existing?.approved === true,
        updated_at: existing?.updated_at || 0,
      };

      await supabase.from("players").upsert(playerData);
    };

    const { data, error } = await supabase.auth.signUp({
      email,
      password: authForm.password,
      options: {
        data: {
          name,
          nickname: finalNickname,
        },
      },
    });

    if (error && String(error.message || "").toLowerCase().includes("already registered")) {
      setAuthView("login");
      return setAuthMsg("Usuário já existe. Faça login com este e-mail.");
    }

    if (error) return setAuthMsg(error.message);

    await createOrUpdatePlayer(data.user?.id || null);

    setUser(data.user || null);
    await loadPlayersFromDb();

    setAuthMsg("Cadastro criado. Aguarde aprovação do Admin.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function requestNotifications() {
    try {
      if (!("Notification" in window)) {
        setPushStatus("indisponível");
        return notifyListChange("Este navegador não suporta notificações.");
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus("bloqueado");
        return notifyListChange("Notificações bloqueadas.");
      }

      setPushStatus("ativo");
      notifyListChange("Notificações internas ativadas neste aparelho.");

      await dbCall(() => supabase.from("push_subscriptions").upsert({
        user_id: user?.id || null,
        email: String(user?.email || "").toLowerCase(),
        player_id: currentPlayer?.id || null,
        onesignal_player_id: "browser-permission-granted",
      }));
    } catch {
      setPushStatus("erro");
      notifyListChange("Push real ainda precisa do provedor configurado.");
    }
  }

  async function saveSettings(patch = {}) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    await dbCall(() => supabase.from("settings").upsert({
      id: 1,
      team_count: patch.teamCount ?? teamCount,
      team_names: patch.teamNames ?? teamNames,
      price: patch.price ?? Number(price || 0),
      list_active: patch.listActive ?? listActive,
      list_locked: patch.listLocked ?? listLocked,
      game_time: patch.gameTime ?? gameTime,
      game_location: patch.gameLocation ?? gameLocation,
      list_deadline: patch.listDeadline ?? listDeadline,
      cash_balance: patch.cashBalance ?? cashBalance,
      game_closed: patch.gameClosed ?? gameClosed,
    }));
  }

  async function linkCurrentUserByEmail() {
    if (!user?.email) return;

    const email = String(user.email).trim().toLowerCase();
    const metaName = String(user.user_metadata?.name || email.split("@")[0]).toUpperCase();
    const metaNickname = String(user.user_metadata?.nickname || metaName).toUpperCase();

    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    const playerData = {
      id: existing?.id || String(Date.now()),
      name: existing?.name || metaName,
      nickname: existing?.nickname || metaNickname,
      email,
      user_id: user.id,
      level: existing?.level || 3,
      position: existing?.position || "Linha",
      status: existing?.status || "pendente",
      role: existing?.role || "athlete",
      approved: existing?.approved === true,
      updated_at: existing?.updated_at || 0,
    };

    await supabase.from("players").upsert(playerData);

    await loadPlayersFromDb();
    notifyListChange("Cadastro criado/vinculado com sucesso.");
  }


  async function createPlayerLoginByAdmin() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const name = form.name.trim().toUpperCase();
    const nickname = form.nickname.trim().toUpperCase();
    const email = form.email.trim().toLowerCase();
    const password = form.tempPassword.trim();

    if (!name) return notifyListChange("Informe o nome do atleta.");
    if (!email) return notifyListChange("Informe o e-mail para criar o login.");
    if (!password || password.length < 6) return notifyListChange("Senha temporária precisa ter pelo menos 6 caracteres.");

    const { data, error } = await supabase.functions.invoke("admin-create-player", {
      body: {
        name,
        nickname,
        email,
        password,
        position: form.position,
        level: Number(form.level || 3),
      },
    });

    if (error) {
      notifyListChange(error.message || "Erro ao chamar a função de criação de login.");
      return;
    }

    if (data?.ok === false) {
      notifyListChange(data.error || "Erro ao criar login do atleta.");
      return;
    }

    notifyListChange("Login do atleta criado. Ele deverá trocar a senha no primeiro acesso.");
    setForm({ name: "", nickname: "", email: "", tempPassword: "", level: 3, position: "Linha" });
    setEditId(null);
    await loadPlayersFromDb();
  }

  async function savePlayer() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const name = form.name.trim().toUpperCase();
    if (!name) return;

    const old = players.find((p) => p.id === editId);
    const player = {
      id: editId || String(Date.now()),
      name,
      nickname: form.nickname.trim().toUpperCase(),
      email: form.email.trim().toLowerCase() || old?.email || "",
      level: Number(form.level || 3),
      position: form.position,
      status: old?.status || "pendente",
      user_id: old?.user_id || null,
      email: form.email.trim().toLowerCase() || old?.email || "",
      role: old?.role || "athlete",
      approved: old?.approved !== false,
      updated_at: old?.updated_at || 0,
    };

    const { error } = await supabase.from("players").upsert(player);

    if (error) return setDbMsg(error.message || "Erro ao salvar jogador");

    setForm({ name: "", nickname: "", email: "", tempPassword: "", level: 3, position: "Linha" });
    setEditId(null);
    await loadPlayersFromDb();
  }

  async function updatePlayerStatus(id, status) {
    const wasInMain = mainSlotPlayers.some((p) => p && String(p.id) === String(id));
    const wantsGame = status === "jogo" || status === "jogo_resenha";

    if (listActive && listLocked && effectiveMode === "atleta") return notifyListChange("Lista BLOQUEADA, novas entradas não permitidas.");
    if (listActive && listLocked && wantsGame && !wasInMain) return notifyListChange("Lista BLOQUEADA, novas entradas não permitidas.");

    const player = players.find((p) => String(p.id) === String(id));
    if (!player) return;

    const updated = { ...player, status, updated_at: Date.now() };
    setPlayers((prev) => prev.map((p) => String(p.id) === String(id) ? updated : p));
    await dbCall(() => supabase.from("players").upsert(updated));

    const label = status === "jogo" ? "confirmou presença no jogo" : status === "jogo_resenha" ? "confirmou jogo + resenha" : status === "resenha" ? "confirmou só resenha" : status === "nao_vou" ? "marcou ausência" : "alterou status";
    await createSmartNotification(`${displayName(player)} ${label}.`, "status_change", "all");
  }

  function askRemovePlayer(player) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    if (String(player?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && !isSuperAdmin) return notifyListChange("Este usuário é o Super Admin e não pode ser removido por outro Admin.");
    setDeleteTarget(player);
  }

  async function confirmRemovePlayer() {
    if (!deleteTarget || !isAdmin) return;

    const targetEmail = String(deleteTarget?.email || "").toLowerCase();
    if (targetEmail === SUPER_ADMIN_EMAIL && !isSuperAdmin) {
      notifyListChange("Este usuário é o Super Admin e não pode ser removido por outro Admin.");
      setDeleteTarget(null);
      return;
    }

    const { data, error } = await supabase.functions.invoke("admin-delete-player", {
      body: {
        playerId: String(deleteTarget.id),
      },
    });

    if (error) {
      setDbMsg(error.message || "Erro ao remover jogador.");
      return;
    }

    if (data?.ok === false) {
      setDbMsg(data.error || "Erro ao remover jogador.");
      return;
    }

    setDeleteTarget(null);
    await loadPlayersFromDb();
    notifyListChange("Jogador removido do banco e do Authentication.");
    createAuditLog("player_removed", { id: deleteTarget?.id, email: deleteTarget?.email, name: displayName(deleteTarget) });
  }

  async function approvePlayer(id) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    const p = players.find((x) => String(x.id) === String(id));
    if (!p) return;
    await supabase.from("players").upsert({ ...p, approved: true });
    await loadPlayersFromDb();
  }

  async function setAdminRole(id) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    const p = players.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && !isSuperAdmin) return notifyListChange("O Super Admin não pode ter a permissão alterada por outro usuário.");
    await supabase.from("players").upsert({ ...p, approved: true, role: p.role === "admin" ? "athlete" : "admin" });
    await loadPlayersFromDb();
  }

  async function openList() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const reset = players.map((p) => ({ ...p, status: "pendente", updated_at: 0 }));

    setPlayers(reset);
    setListActive(true);
    setListLocked(false);
    setGameClosed(false);
    setDeadlineAlertSent(false);
    setDeadlineExpiredAlertSent(false);
    setScreen("home");

    await saveSettings({ listActive: true, listLocked: false, listDeadline, gameClosed: false });
    await dbCall(() => supabase.from("players").upsert(reset));

    createSmartNotification("🟢 Lista aberta. Todos voltaram para pendente.", "list_opened", "all");
    createAuditLog("list_opened", { gameDate, gameTime, gameLocation });
  }

  async function toggleListLock() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const nextLocked = !listLocked;
    const action = nextLocked ? "bloquear" : "desbloquear";

    if (!window.confirm(`Tem certeza que deseja ${action} a lista?`)) return;

    setListLocked(nextLocked);
    await saveSettings({ listActive: true, listLocked: nextLocked });
    createSmartNotification(nextLocked ? "⛔ Lista BLOQUEADA para novas entradas." : "🟢 Lista DESBLOQUEADA para novas entradas.", nextLocked ? "list_locked" : "list_unlocked", "all");
    createAuditLog(nextLocked ? "list_locked" : "list_unlocked", { listActive, listDeadline });
  }

  async function removeList() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    if (!window.confirm("Tem certeza que deseja remover a lista atual? Os status serão zerados e será necessário abrir uma nova lista.")) return;

    const reset = players.map((p) => ({ ...p, status: "pendente", updated_at: 0 }));
    setPlayers(reset);
    setListActive(false);
    setListLocked(false);
    setListDeadline("");
    setGameClosed(false);
    setTeams(null);
    setInitial([]);

    await saveSettings({ listActive: false, listLocked: false, listDeadline: "", gameClosed: false });
    await dbCall(() => supabase.from("players").upsert(reset));

    createSmartNotification("🗑️ Lista removida. Abra uma nova lista para receber confirmações.", "list_removed", "all");
    createAuditLog("list_removed", {});
  }

  function getPlayerListPosition(playerId) {
    const mainIndex = mainSlotPlayers.findIndex((p) => p && String(p.id) === String(playerId));
    if (mainIndex >= 0) return { type: "main", index: mainIndex + 1 };

    const reserveIndex = reserveList.findIndex((p) => String(p.id) === String(playerId));
    if (reserveIndex >= 0) return { type: "reserve", index: reserveIndex + 1 };

    return { type: "none", index: null };
  }

  function playerListBadge(playerId) {
    const pos = getPlayerListPosition(playerId);
    if (pos.type === "main") return `✅ Na lista #${pos.index}`;
    if (pos.type === "reserve") return `🕒 Suplente #${pos.index}`;
    return "";
  }

  function drawTeams() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const linePool = activeLine.slice(0, 12);
    const goalkeeperPool = activeGoalkeepers.slice(0, 2);

    if (Number(teamCount) === 3 && linePool.length < 12) return notifyListChange("3 times libera com 12 jogadores de linha confirmados.");

    let result = [];

    if (Number(teamCount) === 3) {
      result = Array.from({ length: 3 }, () => ({ players: [], reserves: [], score: 0 }));
      shuffle(linePool).sort((a, b) => b.level - a.level).forEach((p) => {
        const target = result.sort((a, b) => a.score - b.score || a.players.length - b.players.length)[0];
        target.players.push(p);
        target.score += p.level;
      });
    } else {
      result = Array.from({ length: 2 }, () => ({ players: [], reserves: [], score: 0 }));
      shuffle(goalkeeperPool).slice(0, 2).forEach((gk, i) => {
        result[i].players.push(gk);
        result[i].score += gk.level;
      });

      const lines = shuffle(linePool).sort((a, b) => b.level - a.level);
      const limit = Math.floor(lines.length / 2);

      lines.forEach((p) => {
        const available = result.filter((t) => t.players.filter((x) => x.position !== "Goleiro").length < limit);
        const target = available.length ? available.sort((a, b) => a.score - b.score)[0] : result[Math.floor(Math.random() * 2)];

        if (available.length) {
          target.players.push(p);
          target.score += p.level;
        } else {
          target.reserves.push(p);
        }
      });
    }

    setTeams(result);
    setInitial([]);
    setScreen("match");
  }

  function drawInitialMatch() {
    if (!Array.isArray(teams) || teams.length < 2) return;
    const first = Math.floor(Math.random() * teams.length);
    let second = Math.floor(Math.random() * teams.length);
    while (second === first) second = Math.floor(Math.random() * teams.length);
    setInitial([first, second]);
  }

  async function normalizeAndLinkKnownEmails() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const updated = players.map((p) => ({
      ...p,
      name: String(p.name || "").toUpperCase(),
      nickname: String(p.nickname || "").toUpperCase(),
      email: String(p.email || "").trim().toLowerCase(),
    }));

    await supabase.from("players").upsert(updated);
    await loadPlayersFromDb();
  }

  function newGame() {
    setGames((prev) => [...prev, { id: String(Date.now()), a: 0, b: 1, sa: 0, sb: 0, goals: [], assists: [], fa: "", fb: "", aa: "", ab: "", ca: false, cb: false }]);
  }

  function updateGame(id, patch) {
    setGames((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
  }

  function addPlay(game, side) {
    const teamIndex = side === 0 ? game.a : game.b;
    const scorer = side === 0 ? game.fa : game.fb;
    const assist = side === 0 ? game.aa : game.ab;
    const against = side === 0 ? game.ca : game.cb;
    const scoreLimit = side === 0 ? Number(game.sa || 0) : Number(game.sb || 0);
    const currentGoals = game.goals.filter((g) => g.t === teamIndex).length;

    if (scorer && currentGoals >= scoreLimit) return notifyListChange(`O time ${teamNames[teamIndex]} já tem gols lançados igual ao placar.`);

    const patch = {
      goals: scorer ? [...game.goals, { p: scorer, t: teamIndex, teamName: teamNames[teamIndex], c: against }] : game.goals,
      assists: assist ? [...game.assists, { p: assist, t: teamIndex, teamName: teamNames[teamIndex], c: false }] : game.assists,
    };

    Object.assign(patch, side === 0 ? { fa: "", aa: "", ca: false } : { fb: "", ab: "", cb: false });
    updateGame(game.id, patch);
  }

  function renderSide(game, side) {
    const teamIndex = side === 0 ? game.a : game.b;
    const list = teams?.[teamIndex]?.players || [];
    const goalKey = side === 0 ? "fa" : "fb";
    const assistKey = side === 0 ? "aa" : "ab";
    const againstKey = side === 0 ? "ca" : "cb";
    const against = side === 0 ? game.ca : game.cb;
    const available = against ? mainGamePlayers : list;

    const goalsText = game.goals.filter((g) => g.t === teamIndex).map((g) => {
      const p = players.find((x) => x.name === g.p) || { name: g.p };
      return displayName(p) + (g.c ? " (GC)" : "");
    }).join(", ") || "-";

    const assistsText = game.assists.filter((a) => a.t === teamIndex).map((a) => {
      const p = players.find((x) => x.name === a.p) || { name: a.p };
      return displayName(p);
    }).join(", ") || "-";

    return <div className="bg-zinc-800 p-4 rounded-3xl space-y-3 border border-zinc-700/60">
      <h4 className="text-xl font-black uppercase text-white">{teamNames[teamIndex]}</h4>
      <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={against} onChange={(e) => updateGame(game.id, { [againstKey]: e.target.checked })} /> Gol contra — liberar todos</label>
      <Field label="Quem fez o gol"><select className={inputCls} value={game[goalKey] || ""} onChange={(e) => updateGame(game.id, { [goalKey]: e.target.value })}><option value="">Selecione</option>{available.map((p) => <option key={p.id} value={p.name}>{displayName(p)}</option>)}</select></Field>
      <Field label="Assistência"><select className={inputCls} value={game[assistKey] || ""} onChange={(e) => updateGame(game.id, { [assistKey]: e.target.value })}><option value="">Sem assistência</option>{available.map((p) => <option key={p.id} value={p.name}>{displayName(p)}</option>)}</select></Field>
      <Button onClick={() => addPlay(game, side)} className="w-full">Adicionar jogada</Button>
      <div className="text-xs text-zinc-400 bg-zinc-950/50 rounded-2xl p-3"><p><b>Gols:</b> {goalsText}</p><p><b>Assistências:</b> {assistsText}</p></div>
    </div>;
  }

  function getMvpRanking() {
    const stats = {};

    games.forEach((game) => {
      game.goals.forEach((g) => {
        if (!stats[g.p]) stats[g.p] = { points: 0, goals: 0, assists: 0, ownGoals: 0 };

        if (g.c) {
          stats[g.p].points -= 3;
          stats[g.p].ownGoals += 1;
        } else {
          stats[g.p].points += 2;
          stats[g.p].goals += 1;
        }
      });

      game.assists.forEach((a) => {
        if (!stats[a.p]) stats[a.p] = { points: 0, goals: 0, assists: 0, ownGoals: 0 };
        stats[a.p].points += 1;
        stats[a.p].assists += 1;
      });
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists);
  }

  function autoMvp() {
    const best = getMvpRanking()[0];
    if (best) setMvp(best.name);
  }


  async function changeFirstPassword() {
    setFirstAccessMsg("");
    setAuthMsg("");

    if (!newPassword || newPassword.length < 6) {
      return setFirstAccessMsg("Erro: a nova senha precisa ter pelo menos 6 caracteres.");
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return setFirstAccessMsg("Erro ao trocar senha: " + error.message);
    }

    const { data, error: finishError } = await supabase.functions.invoke("complete-first-access", {
      body: {
        playerId: currentPlayer?.id,
      },
    });

    if (finishError) {
      return setFirstAccessMsg("Senha alterada, mas não foi possível liberar o acesso. Erro: " + finishError.message);
    }

    if (data?.ok === false) {
      return setFirstAccessMsg("Senha alterada, mas não foi possível liberar o acesso. Erro: " + (data.error || "falha desconhecida"));
    }

    setFirstAccessMsg("Troca de senha bem sucedida!");
    setNewPassword("");

    setTimeout(async () => {
      await loadPlayersFromDb();
      setFirstAccessMsg("");
      notifyListChange("Troca de senha bem sucedida!");
    }, 1400);
  }


  function buildCurrentGamePayload({ closed = false } = {}) {
    const presenceSnapshot = players
      .filter((p) => ["jogo", "jogo_resenha", "resenha", "nao_vou"].includes(p.status))
      .map((p) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        position: p.position,
        status: p.status,
        updated_at: p.updated_at || 0,
      }));

    const paymentSnapshot = mainPayers.map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      position: p.position,
      paid: !!pay[p.id],
      value: Number(price || 0),
    }));

    return {
      status: closed ? "closed" : "draft",
      gameDate,
      gameTime,
      gameLocation,
      price: Number(price || 0),
      teamNames,
      teams,
      games,
      mvp,
      presenceSnapshot,
      paymentSnapshot,
      cashSummary: {
        expected,
        paid,
        pending: Math.max(0, expected - paid),
        cashBalance,
      },
      playersSnapshot: mainGamePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        position: p.position,
      })),
      createdAt: new Date().toISOString(),
    };
  }

  async function saveCurrentGameHistory() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    if (!Array.isArray(teams) || teams.length < 2) {
      return notifyListChange("Sorteie os times antes de salvar o jogo.");
    }

    const hasAnyGoal = games.some((g) => (g.goals || []).length > 0);
    if (!hasAnyGoal) {
      return notifyListChange("Lance pelo menos um gol antes de salvar o jogo.");
    }

    const payload = buildCurrentGamePayload({ closed: false });

    const { error } = await supabase.from("app_games").insert({
      game_date: gameDate,
      game_time: gameTime,
      location: gameLocation || "",
      mvp: mvp || "",
      payload,
      status: "draft",
    });

    if (error) {
      return notifyListChange("Erro ao salvar histórico: " + error.message);
    }

    notifyListChange("Jogo salvo no histórico e ranking atualizado.");
    await loadSavedMatches();
  }


  async function finishGameProfessional() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    if (!Array.isArray(teams) || teams.length < 2) {
      return notifyListChange("Sorteie os times antes de encerrar o jogo.");
    }

    const hasAnyEvent = games.some((g) => (g.goals || []).length > 0 || Number(g.sa || 0) > 0 || Number(g.sb || 0) > 0);
    if (!hasAnyEvent) {
      return notifyListChange("Lance o placar ou pelo menos uma estatística antes de encerrar.");
    }

    const message = [
      "Encerrar jogo agora?",
      "",
      "Isso vai salvar o histórico completo, presença, pagamentos, placar, gols, assistências e MVP.",
      "Depois disso a lista será encerrada e bloqueada."
    ].join("\\n");

    if (!window.confirm(message)) return;

    const payload = buildCurrentGamePayload({ closed: true });

    const { error } = await supabase.from("app_games").insert({
      game_date: gameDate,
      game_time: gameTime,
      location: gameLocation || "",
      mvp: mvp || "",
      status: "closed",
      payload,
    });

    if (error) {
      return notifyListChange("Erro ao encerrar jogo: " + error.message);
    }

    setGameClosed(true);
    setListActive(false);
    setListLocked(true);

    await saveSettings({
      listActive: false,
      listLocked: true,
      gameClosed: true,
      cashBalance,
    });

    await loadSavedMatches();

    createSmartNotification("🏁 Jogo encerrado e salvo no histórico com sucesso.", "game_closed", "all");
    createAuditLog("game_closed", { gameDate, gameTime, gameLocation, mvp });
    setScreen("stats");
  }

  async function deleteSavedMatch(matchId) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    if (!window.confirm("Remover este jogo do histórico e recalcular ranking?")) return;

    const { error } = await supabase.from("app_games").delete().eq("id", matchId);

    if (error) return notifyListChange("Erro ao remover jogo: " + error.message);

    notifyListChange("Jogo removido do histórico.");
    await loadSavedMatches();
  }

  function monthlyStats() {
    const stats = {};

    const monthMatches = savedMatches.filter((match) => {
      return String(match.game_date || "").slice(0, 7) === selectedMonth;
    });

    monthMatches.forEach((match) => {
      const payload = match.payload || {};
      const present = payload.playersSnapshot || [];

      present.forEach((p) => {
        const key = p.name;
        if (!stats[key]) {
          stats[key] = {
            name: p.name,
            nickname: p.nickname || p.name,
            games: 0,
            goals: 0,
            assists: 0,
            ownGoals: 0,
            points: 0,
          };
        }
        stats[key].games += 1;
      });

      (payload.games || []).forEach((game) => {
        (game.goals || []).forEach((g) => {
          if (!stats[g.p]) {
            stats[g.p] = { name: g.p, nickname: g.p, games: 0, goals: 0, assists: 0, ownGoals: 0, points: 0 };
          }

          if (g.c) {
            stats[g.p].ownGoals += 1;
            stats[g.p].points -= 3;
          } else {
            stats[g.p].goals += 1;
            stats[g.p].points += 2;
          }
        });

        (game.assists || []).forEach((a) => {
          if (!stats[a.p]) {
            stats[a.p] = { name: a.p, nickname: a.p, games: 0, goals: 0, assists: 0, ownGoals: 0, points: 0 };
          }
          stats[a.p].assists += 1;
          stats[a.p].points += 1;
        });
      });
    });

    return Object.values(stats)
      .map((row) => ({
        ...row,
        avgGoals: row.games ? row.goals / row.games : 0,
      }))
      .sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists || b.avgGoals - a.avgGoals);
  }

  function monthLabel() {
    if (!selectedMonth) return "";
    const [year, month] = selectedMonth.split("-");
    return `${month}/${year}`;
  }

  function StatsScreen() {
    const ranking = monthlyStats();
    const topScorer = [...ranking].sort((a, b) => b.goals - a.goals || b.points - a.points)[0];
    const topAssist = [...ranking].sort((a, b) => b.assists - a.assists || b.points - a.points)[0];
    const bestAvg = [...ranking].filter((r) => r.games > 0).sort((a, b) => b.avgGoals - a.avgGoals || b.goals - a.goals)[0];

    return <div className="space-y-6">
      <Box title="📊 Estatísticas mensais">
        <div className="grid md:grid-cols-[220px_1fr] gap-4 items-end">
          <Field label="Mês do ranking">
            <input className={inputCls} type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </Field>
          <div className="text-zinc-400">
            Ranking de <b className="text-white">{monthLabel()}</b>. Os dados vêm dos jogos salvos no histórico.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <StatCard label="🏅 Artilheiro" value={topScorer ? `${topScorer.nickname} (${topScorer.goals})` : "-"} />
          <StatCard label="🎯 Garçom" value={topAssist ? `${topAssist.nickname} (${topAssist.assists})` : "-"} />
          <StatCard label="📈 Melhor média de gols" value={bestAvg ? `${bestAvg.nickname} (${bestAvg.avgGoals.toFixed(2)})` : "-"} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-2">
            <thead className="text-zinc-400">
              <tr>
                <th className="text-left px-3">#</th>
                <th className="text-left px-3">Atleta</th>
                <th>Jogos</th>
                <th>G</th>
                <th>A</th>
                <th className="text-red-400">Contra</th>
                <th>Pontos</th>
                <th className="text-emerald-400">Média de gols</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && <tr><td colSpan="8" className="text-center text-zinc-400 py-8">Nenhum jogo salvo neste mês.</td></tr>}
              {ranking.map((row, index) => <tr key={row.name} className="bg-zinc-900 border border-zinc-800">
                <td className="p-3 rounded-l-xl text-zinc-400 font-bold">{index + 1}</td>
                <td className="p-3 font-black">{row.nickname}</td>
                <td className="text-center">{row.games}</td>
                <td className="text-center">{row.goals}</td>
                <td className="text-center">{row.assists}</td>
                <td className="text-center text-red-400 font-bold">{row.ownGoals > 0 ? `${row.ownGoals} (-3)` : row.ownGoals}</td>
                <td className="text-center text-emerald-400 font-black">{row.points}</td>
                <td className="text-center text-emerald-400 font-black">{row.avgGoals.toFixed(2)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Box>

      <Box title="🗂️ Histórico de jogos salvos">
        {savedMatches.length === 0 ? <p className="text-zinc-400 text-xs md:text-base">Nenhum jogo salvo ainda.</p> : <div className="space-y-2">
          {savedMatches.map((match) => <div key={match.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <b>{new Date(match.game_date + "T12:00:00").toLocaleDateString("pt-BR")} • {match.game_time || ""}</b>
              <p className="text-xs text-zinc-400">{match.location || "Local não informado"} • MVP: {match.mvp || "-"} • {match.status === "closed" ? "Encerrado" : "Rascunho"}</p>
            </div>
            {isAdmin && <Button onClick={() => deleteSavedMatch(match.id)} className="bg-red-500 text-black">Remover histórico</Button>}
          </div>)}
        </div>}
      </Box>
    </div>;
  }


  async function setFinanceResponsible(playerId) {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");

    const target = players.find((p) => String(p.id) === String(playerId));
    if (!target) return;

    if (!window.confirm(`Definir ${displayName(target)} como Responsável Financeiro? O responsável anterior será removido.`)) return;

    const updated = players.map((p) => ({
      ...p,
      finance_responsible: String(p.id) === String(playerId),
    }));

    const { error } = await supabase.from("players").upsert(updated);

    if (error) return notifyListChange("Erro ao definir responsável financeiro: " + error.message);

    setPlayers(updated);
    notifyListChange(`${displayName(target)} agora é o Responsável Financeiro.`);
    createAuditLog("finance_responsible_set", { playerId, name: displayName(target) });
  }

  async function removeFinanceResponsible() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    if (!window.confirm("Remover o Responsável Financeiro atual?")) return;

    const updated = players.map((p) => ({ ...p, finance_responsible: false }));
    const { error } = await supabase.from("players").upsert(updated);

    if (error) return notifyListChange("Erro ao remover responsável financeiro: " + error.message);

    setPlayers(updated);
    notifyListChange("Responsável Financeiro removido.");
    createAuditLog("finance_responsible_removed", {});
  }

  async function addCashMovement() {
    if (!canAccessCash) return notifyListChange("Acesso permitido somente para Admin ou Responsável Financeiro.");

    const rawAmount = Number(String(cashForm.amount || "0").replace(",", "."));
    const description = String(cashForm.description || "").trim();

    if (!rawAmount || rawAmount <= 0) return notifyListChange("Informe um valor válido.");
    if (!description) return notifyListChange("Informe uma descrição para o lançamento.");

    let signedAmount = rawAmount;
    let nextBalance = Number(cashBalance || 0);

    if (cashForm.type === "entrada") {
      nextBalance += rawAmount;
      signedAmount = rawAmount;
    }

    if (cashForm.type === "saida") {
      nextBalance -= rawAmount;
      signedAmount = -rawAmount;
    }

    if (cashForm.type === "ajuste") {
      signedAmount = rawAmount - Number(cashBalance || 0);
      nextBalance = rawAmount;
    }

    const { error: movementError } = await supabase.from("cash_movements").insert({
      type: cashForm.type,
      amount: signedAmount,
      description,
      balance_after: nextBalance,
      created_by: user?.email || "",
    });

    if (movementError) return notifyListChange("Erro ao lançar caixa: " + movementError.message);

    setCashBalance(nextBalance);
    await saveSettings({ cashBalance: nextBalance });
    setCashForm({ type: "entrada", amount: "", description: "" });
    await loadCashMovements();

    createSmartNotification("💰 Movimento de caixa lançado com sucesso.", "cash_movement", "finance");
    createAuditLog("cash_movement", { type: cashForm.type, amount: signedAmount, description, balance_after: nextBalance });
  }

  async function deleteCashMovement(id) {
    if (!isAdmin) return notifyListChange("Somente Admin pode remover lançamentos do caixa.");
    if (!window.confirm("Remover este lançamento e atualizar o saldo do caixa?")) return;

    const movement = cashMovements.find((m) => String(m.id) === String(id));
    const amountToReverse = Number(movement?.amount || 0);
    const nextBalance = Number(cashBalance || 0) - amountToReverse;

    const { error } = await supabase.from("cash_movements").delete().eq("id", id);
    if (error) return notifyListChange("Erro ao remover lançamento: " + error.message);

    setCashBalance(nextBalance);
    await saveSettings({ cashBalance: nextBalance });
    await loadCashMovements();

    if (typeof createAuditLog === "function") {
      createAuditLog("cash_movement_deleted", { id, amount: amountToReverse, balance_after: nextBalance });
    }

    notifyListChange("Lançamento removido e saldo atualizado.");
  }

  
  function NotificationCenter() {
    const visible = smartNotifications.filter((n) => {
      if (n.audience === "finance") return canAccessCash;
      return true;
    }).slice(0, 8);

    return <Box title="🔔 Central de notificações">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-zinc-400 text-sm">Últimas atualizações importantes do app.</p>
        <div className="flex gap-2">
          <Button onClick={loadSmartNotifications} className="bg-blue-500 text-black">Atualizar</Button>
          {isAdmin && <Button onClick={clearSmartNotifications} className="bg-red-500 text-black">Limpar</Button>}
        </div>
      </div>

      {visible.length === 0 ? <p className="text-zinc-500">Nenhuma notificação registrada.</p> : <div className="space-y-2">
        {visible.map((n) => <div key={n.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <b className="text-white">{n.message}</b>
            <span className="text-xs text-zinc-500">{n.created_at ? new Date(n.created_at).toLocaleString("pt-BR") : ""}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{n.type || "info"} {n.created_by ? `• ${n.created_by}` : ""}</p>
        </div>)}
      </div>}
    </Box>;
  }


  function currentPlayerMonthlyStats() {
    if (!currentPlayer) return null;
    const ranking = typeof rankingStats === "function" ? rankingStats() : [];
    return ranking.find((r) => r.name === currentPlayer.name) || null;
  }

  function AdminDashboard() {
    const ranking = typeof rankingStats === "function" ? rankingStats() : [];
    const leader = ranking[0];
    const pendingApprovalCount = typeof pendingApprovalPlayers !== "undefined" ? pendingApprovalPlayers.length : players.filter((p) => p.approved === false).length;
    const paidCount = mainPayers.filter((p) => pay[p.id]).length;
    const totalMain = mainGamePlayers.length;
    const remainingSlots = Math.max(0, 14 - totalMain);
    const statusText = !listActive ? "Sem lista" : listExpired ? "Prazo encerrado" : listLocked ? "Bloqueada" : "Aberta";
    const statusTone = !listActive ? "bg-zinc-800" : listExpired || listLocked ? "bg-red-950/70" : "bg-emerald-950/70";

    return <div className="space-y-5">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-zinc-950 rounded-3xl p-5 md:p-7 shadow-2xl border border-yellow-400/40 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <p className="text-black/70 font-black uppercase tracking-widest text-xs">Painel de comando</p>
            <h2 className="text-3xl md:text-5xl font-black text-black leading-tight mt-1">Amigos FC</h2>
            <p className="text-black/80 font-bold mt-2">Lista, caixa, ranking e jogo em uma visão rápida.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
              <div className="bg-black/25 backdrop-blur rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Status</p><b>{statusText}</b></div>
              <div className="bg-black/25 backdrop-blur rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Na lista</p><b>{totalMain}/14</b></div>
              <div className="bg-black/25 backdrop-blur rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Caixa</p><b>{money(cashBalance)}</b></div>
              <div className="bg-black/25 backdrop-blur rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Líder</p><b>{leader ? leader.nickname : "-"}</b></div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-xl font-black">⏳ Prazo da lista</h3>
          <div className={`${statusTone} border border-zinc-700 rounded-3xl p-5`}>
            <p className="text-zinc-400 text-sm">Tempo restante</p>
            <b className="text-3xl md:text-4xl">{formatCountdown()}</b>
            <p className="text-zinc-400 text-xs mt-2">{listDeadline ? new Date(listDeadline).toLocaleString("pt-BR") : "Nenhum prazo definido"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setScreen("newGame")} className="bg-blue-500 text-black">Gerenciar lista</Button>
            <Button onClick={() => setScreen("match")} className="bg-emerald-500 text-black">Times/Jogo</Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Vagas restantes" value={remainingSlots} tone={remainingSlots === 0 ? "bg-emerald-950/70" : "bg-blue-950/70"} />
        <StatCard label="Pagamentos" value={`${paidCount}/${mainPayers.length}`} tone={paidCount === mainPayers.length && mainPayers.length ? "bg-emerald-950/70" : "bg-yellow-950/70"} />
        <StatCard label="Pendentes aprovação" value={pendingApprovalCount} tone={pendingApprovalCount ? "bg-yellow-950/70" : "bg-zinc-800"} />
        <StatCard label="Notificações" value={smartNotifications.length} tone="bg-zinc-800" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-black">🏆 Top 5 do mês</h3>
            <Button onClick={() => setScreen("stats")} className="bg-yellow-500 text-black">Ver ranking</Button>
          </div>
          {ranking.slice(0, 5).length === 0 ? <p className="text-zinc-500">Nenhum jogo salvo no ranking atual.</p> : <div className="space-y-2">
            {ranking.slice(0, 5).map((r, i) => <div key={r.name} className="bg-zinc-800 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-yellow-500 text-black font-black flex items-center justify-center">{i + 1}</span><div><b>{r.nickname}</b><p className="text-xs text-zinc-400">{r.goals} gols • {r.assists} ass. • {r.mvp} MVP</p></div></div>
              <b className="text-emerald-400">{r.points} pts</b>
            </div>)}
          </div>}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
          <h3 className="text-xl font-black mb-4">⚡ Ações rápidas</h3>
          <div className="grid gap-2">
            <Button onClick={() => setScreen("players")} className="bg-zinc-100 text-black">Jogadores</Button>
            <Button onClick={() => setScreen("cash")} className="bg-yellow-500 text-black">Caixa</Button>
            <Button onClick={() => setScreen("stats")} className="bg-blue-500 text-black">Estatísticas</Button><Button onClick={() => setScreen("security")} className="bg-zinc-100 text-black">Segurança</Button>
          </div>
        </div>
      </div>
    </div>;
  }

  function AthleteDashboard() {
    const pos = currentPlayer ? getPlayerListPosition(currentPlayer.id) : { type: "none" };
    const stats = currentPlayerMonthlyStats();
    const statusLabel = currentPlayer?.status === "jogo" ? "Vou no jogo ⚽" : currentPlayer?.status === "jogo_resenha" ? "Jogo + Resenha 🍖⚽" : currentPlayer?.status === "resenha" ? "Só Resenha 🍖" : currentPlayer?.status === "nao_vou" ? "Não vou" : "Pendente";
    const paymentStatus = currentPlayer && pay[currentPlayer.id] ? "Pago" : "Pendente";
    const positionText = pos.type === "main" ? `Na lista #${pos.index}` : pos.type === "reserve" ? `Suplente #${pos.index}` : "Fora da lista";

    return <div className="space-y-5">
      <div className="bg-gradient-to-br from-yellow-500 to-zinc-950 rounded-3xl p-5 border border-yellow-400/40 shadow-2xl">
        <p className="text-black/70 text-xs uppercase tracking-widest font-black">Meu painel</p>
        <h2 className="text-3xl font-black text-black mt-1">{loggedPlayerName}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
          <div className="bg-black/25 rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Status</p><b>{statusLabel}</b></div>
          <div className="bg-black/25 rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Lista</p><b>{positionText}</b></div>
          <div className="bg-black/25 rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Pagamento</p><b>{paymentStatus}</b></div>
          <div className="bg-black/25 rounded-2xl p-3 text-white"><p className="text-xs opacity-70">Prazo</p><b>{formatCountdown()}</b></div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <StatCard label="Jogos no mês" value={stats?.games || 0} />
        <StatCard label="Gols" value={stats?.goals || 0} />
        <StatCard label="Assistências" value={stats?.assists || 0} />
        <StatCard label="Pontos" value={stats?.points || 0} tone="bg-emerald-950/70" />
      </div>
    </div>;
  }


  function roleLabel(p) {
    if (String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && SUPER_ADMIN_EMAIL) return "Super Admin";
    if (p.role === "admin") return "Admin";
    if (p.finance_responsible) return "Responsável Financeiro";
    return "Atleta";
  }

  function roleBadgeClass(p) {
    if (String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && SUPER_ADMIN_EMAIL) return "bg-yellow-500 text-black";
    if (p.role === "admin") return "bg-emerald-500 text-black";
    if (p.finance_responsible) return "bg-blue-500 text-black";
    return "bg-zinc-700 text-white";
  }

  async function refreshSecurityData() {
    await loadPlayersFromDb();
    await loadAuditLogs();
    notifyListChange("Dados de segurança atualizados.");
  }


  function PlayerAvatarPremium({ name }) {
    const text = String(name || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase() || "?";
    return <div className="w-16 h-16 rounded-full bg-black border border-yellow-500 flex items-center justify-center text-yellow-400 text-2xl font-black shrink-0 shadow-lg shadow-yellow-500/10">{text}</div>;
  }

  function PremiumPill({ children, tone = "zinc" }) {
    const tones = {
      yellow: "bg-yellow-500/15 text-yellow-300 border-yellow-500/50",
      green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/50",
      red: "bg-red-500/15 text-red-300 border-red-500/50",
      blue: "bg-blue-500/15 text-blue-300 border-blue-500/50",
      zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
    };
    return <span className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1 text-xs font-black ${tones[tone] || tones.zinc}`}>{children}</span>;
  }

  function PremiumActionButton({ children, onClick, tone = "zinc", disabled = false }) {
    const tones = {
      yellow: "bg-yellow-500 text-black border-yellow-300",
      green: "bg-emerald-500 text-black border-emerald-300",
      red: "bg-red-500 text-black border-red-300",
      blue: "bg-blue-500 text-black border-blue-300",
      zinc: "bg-zinc-800 text-white border-zinc-700",
    };
    return <button disabled={disabled} onClick={onClick} className={`rounded-2xl border px-3 py-3 text-sm font-black shadow-lg active:scale-[0.97] transition disabled:opacity-40 ${tones[tone] || tones.zinc}`}>{children}</button>;
  }

  function PlayerCardPremium({ p, index }) {
    const protectedSuper = String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && !isSuperAdmin;
    return <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl">
      <div className="flex items-start gap-4">
        <PlayerAvatarPremium name={displayName(p)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 font-black">#{index + 1}</p>
              <h3 className="text-xl font-black truncate">{p.name}</h3>
              <p className="text-yellow-300 font-black truncate">{displayName(p)}</p>
              <p className="text-zinc-400 text-sm truncate">{p.email || "Sem e-mail vinculado"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <PremiumPill tone={p.position === "Goleiro" ? "blue" : "zinc"}>{p.position}</PremiumPill>
            <PremiumPill tone="yellow">Nível {hide ? "•••" : p.level}</PremiumPill>
            {p.role === "admin" && <PremiumPill tone="green">Admin</PremiumPill>}
            {p.finance_responsible && <PremiumPill tone="yellow">Financeiro</PremiumPill>}
            {p.approved === false ? <PremiumPill tone="red">Aguardando aprovação</PremiumPill> : <PremiumPill tone="green">Aprovado</PremiumPill>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
        <PremiumActionButton tone="blue" onClick={() => { setEditId(p.id); setForm({ name: p.name, nickname: p.nickname || "", email: p.email || "", tempPassword: "", level: p.level, position: p.position }); }}>Editar</PremiumActionButton>
        {p.approved === false && <PremiumActionButton tone="green" onClick={() => approvePlayer(p.id)}>Aprovar</PremiumActionButton>}
        <PremiumActionButton tone="yellow" disabled={protectedSuper} onClick={() => setAdminRole(p.id)}>{p.role === "admin" ? "Tirar admin" : "Admin"}</PremiumActionButton>
        <PremiumActionButton tone="green" onClick={() => p.finance_responsible ? removeFinanceResponsible() : setFinanceResponsible(p.id)}>{p.finance_responsible ? "Tirar financeiro" : "Financeiro"}</PremiumActionButton>
        <PremiumActionButton tone="red" disabled={protectedSuper} onClick={() => askRemovePlayer(p)}>Remover</PremiumActionButton>
      </div>
    </div>;
  }


  function SecurityScreen() {
    if (!isAdmin) {
      return <Box title="🛡️ Segurança"><div className="bg-red-950/50 border border-red-700 rounded-2xl p-4 text-red-300 font-black">Acesso permitido somente para Admin.</div></Box>;
    }

    const q = securitySearch.toLowerCase();
    const filteredSecurityPlayers = players.filter((p) => `${p.name} ${p.nickname || ""} ${p.email || ""}`.toLowerCase().includes(q));
    const admins = players.filter((p) => p.role === "admin" || String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL);
    const finance = players.filter((p) => p.finance_responsible);
    const pending = players.filter((p) => p.approved === false);

    return <div className="space-y-5">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-yellow-500/15 border border-yellow-500 flex items-center justify-center text-3xl">🛡️</div>
          <div>
            <h2 className="text-3xl font-black">Segurança</h2>
            <p className="text-zinc-400">Usuários, acessos e permissões.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-center"><p className="text-xs text-zinc-500">Admins</p><b className="text-2xl text-yellow-400">{admins.length}</b></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-center"><p className="text-xs text-zinc-500">Financeiro</p><b className="text-2xl text-yellow-400">{finance.length}</b></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-center"><p className="text-xs text-zinc-500">Pendentes</p><b className="text-2xl text-yellow-400">{pending.length}</b></div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 mb-5">
          <input className={inputCls} placeholder="Buscar usuário..." value={securitySearch} onChange={(e) => setSecuritySearch(e.target.value)} />
          <button onClick={refreshSecurityData} className="w-14 rounded-2xl bg-yellow-500 text-black font-black">↻</button>
        </div>

        <div className="space-y-3">
          {filteredSecurityPlayers.map((p, i) => <PlayerCardPremium key={p.id} p={p} index={i} />)}
        </div>

        <div className="mt-5 bg-black/40 border border-yellow-500/30 rounded-3xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-yellow-500/15 border border-yellow-500 flex items-center justify-center text-2xl">🔒</div>
          <div>
            <b>Logs de auditoria ativos</b>
            <p className="text-sm text-zinc-400">As ações continuam sendo gravadas em segundo plano, mas não aparecem nesta tela.</p>
          </div>
        </div>
      </div>
    </div>;
  }




  function PremiumHeaderStable() {
    const unreadCount = smartNotifications.length || liveEvents.length || 0;

    return <header className="bg-zinc-950/95 border border-zinc-800 rounded-[22px] p-3 shadow-2xl sticky top-2 z-50 backdrop-blur">
      <div className="flex items-center gap-3">
        <img src={APP_ICON_SRC} alt="Amigos FC" className="w-14 h-14 rounded-2xl object-cover border border-yellow-400/50 shadow-lg shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-emerald-400 font-black text-sm whitespace-nowrap">● Banco conectado</p>
          <p className="text-zinc-500 text-xs whitespace-nowrap">
            {effectiveMode === "admin" ? "Painel Admin" : "Perfil Atleta"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="relative w-10 h-10 rounded-full border border-zinc-700 bg-zinc-950/80 flex items-center justify-center text-lg shadow-lg active:scale-95 transition" onClick={() => setShowNotifications(true)} title="Notificações">
            🔔
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">{Math.min(unreadCount, 9)}</span>}
          </button>

          {isAdmin && <button className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-950/80 flex items-center justify-center text-base shadow-lg active:scale-95 transition" onClick={() => setMode(mode === "admin" ? "atleta" : "admin")} title="Alternar modo">
            {effectiveMode === "admin" ? "🧑‍💼" : "👤"}
          </button>}

          {user && <button className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-950/80 flex items-center justify-center text-lg shadow-lg active:scale-95 transition" onClick={signOut} title="Sair">
            ↪
          </button>}
        </div>
      </div>
    </header>;
  }


  function BottomNavStable() {
    const nav = isAdmin
      ? [
          ["home", "⌂", "Início"],
          ["players", "♚", "Jogadores"],
          ["match", "⚽", "Times"],
          ["cash", "💰", "Caixa"],
          ["security", "🛡️", "Segurança"],
        ]
      : [
          ["home", "⌂", "Início"],
          ["match", "⚽", "Lista"],
          ["stats", "📊", "Ranking"],
          ["cash", "💰", "Caixa"],
        ];

    return <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-zinc-800 px-2 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className={isAdmin ? "grid grid-cols-5 gap-1 max-w-3xl mx-auto" : "grid grid-cols-4 gap-1 max-w-xl mx-auto"}>
        {nav.map(([key, icon, label]) => {
          const active = screen === key;
          return <button
            key={key}
            onClick={() => setScreen(key)}
            className={`h-[62px] rounded-2xl flex flex-col items-center justify-center gap-1 transition active:scale-[0.96] ${active ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-zinc-950 text-zinc-400 border border-zinc-800"}`}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] sm:text-xs font-black leading-none whitespace-nowrap">{label}</span>
          </button>;
        })}
      </div>
    </nav>;
  }

  function PremiumNavStable() {
    return null;
  }

  function PremiumNotificationsModalStable() {
    if (!showNotifications) return null;

    const tabs = ["Todas", "Lista", "Confirmações", "Caixa"];
    const mapped = smartNotifications.filter((n) => n.audience === "finance" ? canAccessCash : true).map((n) => {
      const type = String(n.type || "").toLowerCase();
      let group = "Sistema";
      if (type.includes("list") || type.includes("deadline")) group = "Lista";
      if (type.includes("status")) group = "Confirmações";
      if (type.includes("cash")) group = "Caixa";
      return { ...n, group };
    });

    const visible = mapped.filter((n) => notificationTab === "Todas" || n.group === notificationTab).slice(0, 20);

    return <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center p-0 sm:p-3">
      <div className="w-full max-w-3xl bg-zinc-950 border border-yellow-500/40 rounded-t-[34px] md:rounded-[34px] shadow-2xl p-5 max-h-[88vh] overflow-hidden flex flex-col">
        <div className="w-16 h-1.5 rounded-full bg-zinc-700 mx-auto mb-5 md:hidden"></div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 border border-yellow-400 flex items-center justify-center text-3xl shrink-0">🔔</div>
            <div><h2 className="text-3xl font-black">Notificações</h2><p className="text-zinc-400">Fique por dentro do que importa.</p></div>
          </div>
          <button onClick={() => setShowNotifications(false)} className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-2xl">✕</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
          {tabs.map((tab) => <button key={tab} onClick={() => setNotificationTab(tab)} className={`px-5 py-3 rounded-2xl border whitespace-nowrap font-black transition ${notificationTab === tab ? "bg-yellow-500 text-black border-yellow-300" : "bg-zinc-900 border-zinc-700 text-zinc-300"}`}>{tab}</button>)}
        </div>
        <div className="overflow-y-auto pr-1 space-y-3">
          {visible.length === 0 ? <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-zinc-400">Nenhuma notificação nesta aba.</div> : visible.map((n, index) => <div key={n.id || index} className={`rounded-3xl p-4 border ${index === 0 ? "bg-yellow-500/10 border-yellow-400" : "bg-zinc-900 border-zinc-800"}`}>
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-full bg-black/40 border border-yellow-500/40 flex items-center justify-center text-2xl shrink-0">{n.group === "Caixa" ? "💰" : n.group === "Lista" ? "📋" : n.group === "Confirmações" ? "👤" : "🔔"}</div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><b className="text-lg leading-snug">{n.message}</b>{index < 3 && <span className="bg-yellow-400 text-black rounded-lg px-2 py-1 text-[10px] font-black shrink-0">NOVO</span>}</div><p className="text-sm text-zinc-500 mt-2">🕒 {n.created_at ? new Date(n.created_at).toLocaleString("pt-BR") : ""} • {n.group}</p></div>
            </div>
          </div>)}
        </div>
        <button onClick={() => setShowNotifications(false)} className="w-full mt-4 rounded-2xl border border-yellow-500/40 bg-zinc-900 p-4 text-yellow-300 font-black">Fechar notificações</button>
      </div>
    </div>;
  }

  function Header() {
    const nav = isAdmin ? [["home", "🏠 Início"], ["players", "👥 Jogadores"], ["newGame", "🆕 Novo jogo"], ["match", "⚽ Times"], ["stats", "📊 Estatísticas"], ["cash", "💰 Caixa"], ["security", "🛡️ Segurança"]] : [["home", "🏠 Início"], ["cash", "💰 Caixa"]];

    return <header className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl md:rounded-3xl p-3 sm:p-5 shadow-2xl space-y-4 sticky top-0 z-40 backdrop-blur">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div><div className="flex items-center gap-3"><img src={APP_ICON_SRC} alt="Amigos FC" className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover border border-yellow-400/40 shadow-lg" /><h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">App dos Amigos FC</h1></div><p className={dbMsg === "Banco conectado" ? "text-emerald-400 text-sm font-bold" : "text-yellow-400 text-sm font-bold"}>{dbMsg}</p></div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={requestNotifications} className="w-full sm:w-auto text-xs sm:text-sm">🔔 Push: {pushStatus}</Button>
          {isAdmin && <Button onClick={() => setMode(mode === "admin" ? "atleta" : "admin")} className={(effectiveMode === "admin" ? "bg-emerald-500 text-black" : "bg-blue-500 text-black") + " w-full sm:w-auto text-xs sm:text-sm"}>{effectiveMode === "admin" ? "Modo Admin" : "Modo Atleta"}</Button>}
          {screen !== "home" && <Button onClick={() => setScreen("home")} className="w-full sm:w-auto text-xs sm:text-sm">⬅ Voltar</Button>}
          <Button onClick={() => setHide(!hide)} className="w-full sm:w-auto text-xs sm:text-sm">{hide ? "Mostrar níveis" : "Hide níveis"}</Button>
          {user && <Button onClick={signOut} className="w-full sm:w-auto text-xs sm:text-sm">Sair</Button>}
        </div>
      </div>
      {(isAdmin || isFinanceResponsible) && <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">{nav.map(([key, label]) => <button key={key} onClick={() => setScreen(key)} className={`rounded-2xl px-2 py-3 font-black text-xs sm:text-sm transition border min-h-[54px] flex items-center justify-center text-center ${screen === key ? "bg-emerald-500 text-black border-emerald-300" : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"}`}>{label}</button>)}</nav>}
    </header>;
  }

  function ListBoard() {
    const listDate = brDateFromInput(gameDate);

    return <Box title="📋 Lista ativa">
      {!listActive ? <div className="text-center py-10"><p className="text-3xl font-black">Nenhuma lista ativa</p><p className="text-zinc-400 mt-2">Aguardando o Admin abrir a lista do próximo jogo.</p></div> : <div className="space-y-5">
        <div className="bg-zinc-950 border border-emerald-800 rounded-3xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-zinc-800 pb-4 mb-4">
            <div><div className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 border ${listLocked ? "bg-red-950/50 border-red-700" : "bg-emerald-950/50 border-emerald-700"}`}><span className="text-3xl">{listLocked ? "⛔" : "🟢"}</span><h2 className="text-lg md:text-2xl font-black leading-tight">{listLocked ? "Lista BLOQUEADA para novas entradas" : "Lista ABERTA"} - {listDate}</h2></div><p className="text-zinc-300 mt-3 text-lg">📍 {gameLocation || "Local não informado"} • 🕒 {gameTime}</p><p className={listExpired ? "text-red-400 mt-2 font-black" : "text-emerald-400 mt-2 font-black"}>⏳ Lista aberta até: {listDeadline ? new Date(listDeadline).toLocaleString("pt-BR") : "sem prazo"} • {formatCountdown()}</p></div>
            <div className="text-xs text-zinc-400 bg-zinc-900 rounded-2xl p-3"><p>⚽ Quem vai no jogo</p><p>🍖⚽ Jogo + Resenha</p><p>🍖 Só Resenha</p></div>
          </div>
          <div className="space-y-2 font-mono text-sm md:text-base">{mainSlotPlayers.map((p, i) => <div key={i} className="flex items-center gap-2 bg-zinc-900/70 rounded-xl px-3 py-2"><span className="w-8 shrink-0">{i + 1}-</span><span className="w-7 shrink-0">{i < 2 ? "🥅" : ""}</span><span className="font-bold">{p ? displayName(p) : ""}</span>{p && <span>{statusEmoji(p)}</span>}{p && <span className="text-xs text-zinc-400 ml-2">{formatDateTime(p.updated_at)}</span>}</div>)}</div>
        </div>
        {reserveList.length > 0 && <div className="bg-yellow-950/30 border border-yellow-800 rounded-3xl p-5"><h3 className="text-xl font-black mb-3">🕒 Suplentes</h3>{reserveList.map((p, i) => <p key={p.id} className="py-1">{i + 1}- {displayName(p)} {statusEmoji(p)}</p>)}</div>}
        <div className="grid md:grid-cols-2 gap-4"><div className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800"><h3 className="text-xl font-black mb-3">Só Resenha</h3>{resenhaOnly.length ? resenhaOnly.map((p, i) => <p key={p.id}>{i + 1}- {displayName(p)} 🍖</p>) : <p className="text-zinc-500">Nenhum confirmado só para resenha.</p>}</div><div className="bg-red-950/30 rounded-3xl p-5 border border-red-800"><h3 className="text-xl font-black mb-3">Ausentes</h3>{absentList.length ? absentList.map((p, i) => <p key={p.id}>{i + 1}- {displayName(p)}</p>) : <p className="text-zinc-500">Nenhum ausente.</p>}</div></div>
      </div>}
    </Box>;
  }

  if (!user) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"><div className="text-center space-y-2"><img src={APP_ICON_SRC} alt="Amigos FC" className="w-24 h-24 mx-auto rounded-3xl shadow-2xl border border-yellow-400/40 object-cover" /><h1 className="text-3xl font-black">App dos Amigos FC</h1><p className="text-zinc-400 text-xs md:text-base">Entre ou crie seu acesso.</p></div>{authView === "signup" && <><Field label="Nome completo"><input className={inputCls} value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value.toUpperCase() })} /></Field><Field label="Nome/Apelido (lista)"><input className={inputCls} value={authForm.nickname} onChange={(e) => setAuthForm({ ...authForm, nickname: e.target.value.toUpperCase() })} /></Field></>}<Field label="E-mail"><input className={inputCls} type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></Field><Field label="Senha"><input className={inputCls} type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></Field>{authView === "signup" && <Field label="Posição"><select className={inputCls} value={authForm.position} onChange={(e) => setAuthForm({ ...authForm, position: e.target.value })}><option value="Linha">Linha</option><option value="Goleiro">Gol</option></select></Field>}{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={authView === "login" ? signIn : signUp} className="bg-emerald-500 text-black w-full">{authView === "login" ? "Entrar" : "Criar acesso"}</Button><button className="text-sm text-emerald-400 font-bold w-full" onClick={() => setAuthView(authView === "login" ? "signup" : "login")}>{authView === "login" ? "Criar novo acesso" : "Já tenho acesso"}</button></div></main>;

  if (user && !currentPlayer && !isSuperAdmin) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md text-center space-y-4"><h1 className="text-3xl font-black">Cadastro não vinculado</h1><p className="text-zinc-400 text-xs md:text-base">Seu login existe, mas ainda não está ligado ao cadastro de jogadores.</p><p className="text-sm text-zinc-500">E-mail logado: {user.email}</p>{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={linkCurrentUserByEmail} className="bg-emerald-500 text-black w-full">Vincular automaticamente pelo e-mail</Button><Button onClick={signOut}>Sair</Button></div></main>;
  if (currentPlayer?.must_change_password) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4"><h1 className="text-3xl font-black">Trocar senha</h1><p className="text-zinc-400 text-xs md:text-base">Este login foi criado pelo Admin. Defina sua senha definitiva para continuar.</p><Field label="Nova senha"><input className={inputCls} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>{firstAccessMsg && <p className={firstAccessMsg.startsWith("Troca") ? "text-emerald-400 text-sm font-bold" : "text-yellow-400 text-sm font-bold"}>{firstAccessMsg}</p>}{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={changeFirstPassword} className="bg-emerald-500 text-black w-full">Salvar nova senha</Button><Button onClick={signOut}>Sair</Button></div></main>;
  if (!isAdmin && currentPlayer && currentPlayer.approved === false) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md text-center space-y-4"><h1 className="text-3xl font-black">Aguardando aprovação</h1><p className="text-zinc-400 text-xs md:text-base">Seu acesso foi criado, mas ainda precisa ser aprovado pelo Admin.</p><Button onClick={signOut}>Sair</Button></div></main>;

  return <main className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-8 space-y-5 md:space-y-6 pb-28"><PremiumHeaderStable />
  <PremiumNotificationsModalStable />{notice && <div className="bg-emerald-500 text-black rounded-2xl p-3 font-bold shadow-xl">{notice}</div>}{gameClosed && <div className="bg-yellow-500 text-black rounded-2xl p-3 font-black shadow-xl">✅ Último jogo encerrado e salvo no histórico. Abra uma nova lista para o próximo jogo.</div>}{screen === "home" && <div className="space-y-6">{isAdmin ? <AdminDashboard /> : <AthleteDashboard />}{liveEvents.length > 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-2"><h3 className="font-black text-white">🔔 Atualizações em tempo real</h3>{liveEvents.map((e) => <p key={e.id} className="text-sm text-zinc-300"><span className="text-emerald-400 font-bold">{e.time}</span> — {e.message}</p>)}</div>}<ListBoard />{effectiveMode === "atleta" && <Box title="🙋 Confirmar presença">
        {!listActive && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-zinc-300 font-bold">
            ⏳ Não existe nenhuma lista aberta, aguarde a liberação para alterar seu status.
          </div>
        )}

        {listActive && !listLocked && !listExpired && (
          <div className={mainGamePlayers.length >= 14 ? "bg-yellow-950/50 border border-yellow-700 rounded-2xl p-4 text-yellow-300 font-bold" : "bg-emerald-950/50 border border-emerald-700 rounded-2xl p-4 text-emerald-300 font-bold"}>
            {mainGamePlayers.length >= 14
              ? "✅ Lista principal completa: próximos confirmados entram como suplentes."
              : `🟢 Lista aberta: ${Math.max(0, 14 - mainGamePlayers.length)} vaga(s) restantes.`}
          </div>
        )}

        {listExpired && (
          <div className="bg-red-950/50 border border-red-700 rounded-2xl p-4 text-red-300 font-black">
            ⏰ O prazo da lista encerrou. Aguarde o Admin liberar novamente.
          </div>
        )}

        {listLocked && (
          <div className="bg-red-950/50 border border-red-700 rounded-2xl p-4 text-red-300 font-black">
            ⛔ Lista BLOQUEADA, novas entradas não permitidas.
          </div>
        )}

        <Field label="Você está logado como">
          <input className={inputCls} disabled value={loggedPlayerName} />
        </Field>

        {currentPlayer?.id && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Button disabled={!listCanReceiveStatus} onClick={() => updatePlayerStatus(currentPlayer.id, "jogo")} className="bg-blue-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                ⚽ Vou no jogo
              </Button>

              <Button disabled={!listCanReceiveStatus} onClick={() => updatePlayerStatus(currentPlayer.id, "jogo_resenha")} className="bg-emerald-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                🍖⚽ Jogo + Resenha
              </Button>

              <Button disabled={!listCanReceiveStatus} onClick={() => updatePlayerStatus(currentPlayer.id, "resenha")} className="disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                🍖 Só Resenha
              </Button>

              <Button disabled={!listCanReceiveStatus} onClick={() => updatePlayerStatus(currentPlayer.id, "nao_vou")} className="bg-red-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                Não vou
              </Button>
            </div>

            {isGame(currentPlayer) && listActive && (
              <div className={getPlayerListPosition(currentPlayer.id).type === "reserve" ? "bg-yellow-950/50 border border-yellow-800 rounded-2xl p-3 text-yellow-300 font-bold" : "bg-emerald-950/50 border border-emerald-800 rounded-2xl p-3 text-emerald-300 font-bold"}>
                {playerListBadge(currentPlayer.id)}
              </div>
            )}
          </div>
        )}
      </Box>}{!isAdmin && isFinanceResponsible && <div className="grid grid-cols-1 gap-3 md:gap-4">
  <button onClick={() => setScreen("cash")} className="bg-gradient-to-br from-yellow-950/70 to-zinc-900 border border-yellow-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl">
    <div className="text-4xl md:text-5xl mb-3 md:mb-4">💰</div>
    <h2 className="text-lg md:text-2xl font-black leading-tight">Caixa</h2>
    <p className="text-zinc-400 text-xs md:text-base">Acesso do Responsável Financeiro.</p>
  </button>
</div>}{effectiveMode === "admin" && <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4"><button onClick={() => setScreen("players")} className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl min-h-[150px] md:min-h-[210px]"><div className="text-4xl md:text-5xl mb-3 md:mb-4">👥</div><h2 className="text-lg md:text-2xl font-black leading-tight">Jogadores</h2><p className="text-zinc-400 text-xs md:text-base">Cadastrar, editar e remover.</p></button><button onClick={() => setScreen("newGame")} className="bg-gradient-to-br from-emerald-950/70 to-zinc-900 border border-emerald-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl min-h-[150px] md:min-h-[210px]"><div className="text-4xl md:text-5xl mb-3 md:mb-4">🆕</div><h2 className="text-lg md:text-2xl font-black leading-tight">Novo jogo</h2><p className="text-zinc-400 text-xs md:text-base">Presença, times e sorteio.</p></button><button onClick={() => setScreen("match")} className="bg-gradient-to-br from-blue-950/70 to-zinc-900 border border-blue-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl min-h-[150px] md:min-h-[210px]"><div className="text-4xl md:text-5xl mb-3 md:mb-4">⚽</div><h2 className="text-lg md:text-2xl font-black leading-tight">Times</h2><p className="text-zinc-400 text-xs md:text-base">Times sorteados.</p></button><button onClick={() => setScreen("stats")} className="bg-gradient-to-br from-blue-950/70 to-zinc-900 border border-blue-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl min-h-[150px] md:min-h-[210px]"><div className="text-4xl md:text-5xl mb-3 md:mb-4">📊</div><h2 className="text-lg md:text-2xl font-black leading-tight">Estatísticas</h2><p className="text-zinc-400 text-xs md:text-base">Ranking mensal automático.</p></button><button onClick={() => setScreen("cash")} className="bg-gradient-to-br from-yellow-950/70 to-zinc-900 border border-yellow-700 rounded-2xl md:rounded-3xl p-4 md:p-8 text-left shadow-2xl min-h-[150px] md:min-h-[210px]"><div className="text-4xl md:text-5xl mb-3 md:mb-4">💰</div><h2 className="text-lg md:text-2xl font-black leading-tight">Caixa</h2><p className="text-zinc-400 text-xs md:text-base">Pagos e pendentes.</p></button></div>}</div>}

  {screen === "players" && <Box title="👥 Cadastrar / editar jogadores"><div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><b>Ferramenta Admin</b><p className="text-xs text-zinc-400">Tudo aqui lê e grava direto no Supabase.</p></div><div className="flex flex-wrap gap-2"><Button onClick={loadPlayersFromDb} className="bg-emerald-500 text-black">Recarregar jogadores do banco</Button><Button onClick={normalizeAndLinkKnownEmails} className="bg-blue-500 text-black">Normalizar cadastros</Button></div></div><div className="grid grid-cols-1 md:grid-cols-6 gap-3">
  <Field label="Nome"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} /></Field>
  <Field label="Apelido na lista"><input className={inputCls} value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value.toUpperCase() })} /></Field>
  <Field label="E-mail do login"><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} /></Field>
  <Field label="Senha temporária"><input className={inputCls} type="text" placeholder="mín. 6 caracteres" value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} /></Field>
  <Field label="Posição"><select className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}><option value="Linha">Linha</option><option value="Goleiro">Gol</option></select></Field>
  <Field label="Nível"><select className={inputCls} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
  <Button onClick={savePlayer} className="bg-emerald-500 text-black w-full">{editId ? "Salvar cadastro" : "Cadastrar atleta"}</Button>
  <Button onClick={createPlayerLoginByAdmin} className="bg-blue-500 text-black w-full">Criar login do atleta</Button>
  {editId && <Button onClick={() => { setEditId(null); setForm({ name: "", nickname: "", email: "", tempPassword: "", level: 3, position: "Linha" }); }}>Cancelar</Button>}
</div>
<p className="text-xs text-zinc-400 -mt-2">Para criar login, informe e-mail e senha temporária. No primeiro acesso o atleta será obrigado a trocar a senha.</p><div className="grid md:grid-cols-[1fr_auto] gap-3 items-end"><Field label="Buscar jogador"><input className={inputCls} value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} /></Field><Field label="Filtro"><select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="todos">Todos</option>{statusList.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</select></Field></div><div className="space-y-3">
  {visiblePlayers.length === 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center text-zinc-400 font-bold">Nenhum jogador carregado. Clique em “Recarregar jogadores do banco”.</div>}
  {visiblePlayers.map((p, i) => <PlayerCardPremium key={p.id} p={p} index={i} />)}
</div></Box>}

  {screen === "newGame" && <div className="grid lg:grid-cols-3 gap-6"><Box title="🆕 Novo jogo"><div className="grid md:grid-cols-2 gap-3"><Field label="Data"><input className={inputCls} type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} /></Field><Field label="Horário"><input className={inputCls} type="time" value={gameTime} onChange={(e) => { setGameTime(e.target.value); saveSettings({ gameTime: e.target.value }); }} /></Field><Field label="Local"><input className={inputCls} value={gameLocation} onChange={(e) => { setGameLocation(e.target.value); saveSettings({ gameLocation: e.target.value }); }} /></Field><Field label="Lista aberta até"><input className={inputCls} type="datetime-local" value={listDeadline} onChange={(e) => { setListDeadline(e.target.value); saveSettings({ listDeadline: e.target.value }); }} /></Field><Field label="Modo de Jogo"><select className={inputCls} value={teamCount} onChange={(e) => { const v = Number(e.target.value); setTeamCount(v); saveSettings({ teamCount: v }); }}><option value={2}>2 times + reservas</option><option value={3} disabled={activeLine.length < 12}>3 times</option></select>{activeLine.length < 12 && <p className="text-xs text-yellow-400 mt-1">3 times libera com 12 jogadores de linha confirmados.</p>}</Field><Field label="Valor por atleta"><input className={inputCls} type="number" value={price} onChange={(e) => { const v = Number(e.target.value || 0); setPrice(v); saveSettings({ price: v }); }} /></Field></div><div className="grid md:grid-cols-3 gap-3">{Array.from({ length: Number(teamCount) }).map((_, i) => <Field key={i} label={`Nome do time ${i + 1}`}><input className={inputCls} value={teamNames[i] || ""} onChange={(e) => { const names = teamNames.map((n, x) => x === i ? e.target.value : n); setTeamNames(names); saveSettings({ teamNames: names }); }} /></Field>)}</div><div className="grid md:grid-cols-4 gap-2"><Button onClick={openList} className="bg-blue-500 text-black w-full">Abrir lista</Button><Button onClick={toggleListLock} className={listLocked ? "bg-emerald-500 text-black w-full" : "bg-yellow-500 text-black w-full"}>{listLocked ? "Desbloquear lista" : "Bloquear lista"}</Button><Button onClick={removeList} className="bg-red-500 text-black w-full">Remover lista</Button><Button onClick={drawTeams} className="bg-emerald-500 text-black w-full">Sortear times</Button></div></Box><Box title="Resumo"><div className="grid grid-cols-2 gap-3"><StatCard label="Jogo" value={mainGamePlayers.length} /><StatCard label="Resenha" value={mainGamePlayers.filter((p) => p.status === "jogo_resenha").length + resenhaOnly.length} /><StatCard label="Pagantes" value={mainPayers.length} /><StatCard label="Arrecadação" value={money(expected)} /></div></Box></div>}

  {screen === "match" && <div className="space-y-6"><Box title="🔥 Times sorteados">{Array.isArray(teams) ? <><div className={teamCount === 3 ? "grid md:grid-cols-3 gap-3" : "grid md:grid-cols-2 gap-3"}>{teams.map((team, i) => { const tag = teamTag(teamNames[i]); return <div key={i} className="bg-zinc-800 rounded-3xl p-4 border border-zinc-700"><div className="flex justify-between items-center mb-3"><b className="text-xl">{teamNames[i]}</b><span className={`${tag.color} px-3 py-1 rounded-xl font-black`}>{tag.short}</span></div><p className="text-xs text-zinc-400 mb-2">Força: {team.score}</p>{team.players.map((p) => <p key={p.id} className="uppercase text-sm">{displayName(p)} {p.position === "Goleiro" ? "🧤" : ""}</p>)}{team.reserves?.length > 0 && <div className="mt-3 border-t border-zinc-700 pt-2"><p className="text-xs text-yellow-400 font-bold">Reservas</p>{team.reserves.map((p) => <p key={p.id} className="uppercase text-xs text-yellow-300">{displayName(p)}</p>)}</div>}</div>; })}</div>{teamCount === 3 && <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3 mt-4"><Button onClick={drawInitialMatch} className="bg-blue-500 text-black w-full">Sortear jogo inicial</Button><div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">{[0, 1].map((slot) => { const idx = initial[slot]; const tag = teamTag(teamNames[idx]); return <div key={slot} className={`h-24 rounded-2xl flex flex-col items-center justify-center font-black shadow-xl ${idx !== undefined ? tag.color : "bg-zinc-800"}`}><span className="text-4xl leading-none">{idx !== undefined ? tag.short : "?"}</span>{idx !== undefined && <small>{teamNames[idx]}</small>}</div>; })}<b className="text-4xl text-white text-center">X</b></div></div>}</> : <p className="text-zinc-400 text-xs md:text-base">Nenhum time sorteado ainda.</p>}</Box>{Array.isArray(teams) && <Box title="⚽ Partidas"><div className="flex justify-between gap-3 flex-wrap"><p className="text-zinc-400 text-xs md:text-base">Lance placar, gols e assistências.</p><Button onClick={() => setGames((prev) => [...prev, { id: String(Date.now()), a: 0, b: 1, sa: 0, sb: 0, goals: [], assists: [], fa: "", fb: "", aa: "", ab: "", ca: false, cb: false }])} className="bg-emerald-500 text-black">+ Gerar jogo</Button></div>{games.map((game) => <div key={game.id} className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-5 shadow-2xl"><div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"><Field label="Time 1"><select className={inputCls} value={game.a} onChange={(e) => updateGame(game.id, { a: Number(e.target.value) })}>{teams.map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field><Field label="Gols"><input className={`${inputCls} text-5xl text-center font-black`} type="number" value={game.sa} onChange={(e) => updateGame(game.id, { sa: Number(e.target.value || 0) })} /></Field><b className="text-center text-5xl text-emerald-400">X</b><Field label="Gols"><input className={`${inputCls} text-5xl text-center font-black`} type="number" value={game.sb} onChange={(e) => updateGame(game.id, { sb: Number(e.target.value || 0) })} /></Field><Field label="Time 2"><select className={inputCls} value={game.b} onChange={(e) => updateGame(game.id, { b: Number(e.target.value) })}>{teams.map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field></div><div className="grid md:grid-cols-2 gap-4">{renderSide(game, 0)}{renderSide(game, 1)}</div></div>)}<div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-end"><Field label="Craque do jogo"><select className={inputCls} value={mvp} onChange={(e) => setMvp(e.target.value)}><option value="">Selecione</option>{mainGamePlayers.map((p) => <option key={p.id} value={p.name}>{displayName(p)}</option>)}</select></Field><Button onClick={autoMvp} className="bg-emerald-500 text-black">MVP automático</Button><Button onClick={() => setShowMvpCalc(true)} className="bg-blue-500 text-black">Ver cálculo MVP</Button><Button onClick={saveCurrentGameHistory} className="bg-yellow-500 text-black">Salvar jogo no histórico</Button></div></Box>}</div>}

  {screen === "stats" && <StatsScreen />}

  {screen === "security" && <SecurityScreen />}

  {screen === "cash" && !canAccessCash && <Box title="💰 Caixa"><div className="bg-red-950/50 border border-red-700 rounded-2xl p-4 text-red-300 font-black">Acesso permitido somente para Admin ou Responsável Financeiro.</div></Box>}

  {screen === "cash" && canAccessCash && <Box title="💰 Caixa">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Saldo atual" value={money(cashBalance)} tone={cashBalance >= 0 ? "bg-emerald-950/60" : "bg-red-950/60"} />
      <StatCard label="Pagantes do jogo" value={mainPayers.length} />
      <StatCard label="Estimado jogo" value={money(expected)} />
      <StatCard label="Pendente jogo" value={money(Math.max(0, expected - paid))} tone={expected - paid ? "bg-red-950/60" : "bg-zinc-800"} />
    </div>

    <div className="bg-zinc-950 border border-yellow-800 rounded-3xl p-4 space-y-3"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="text-lg font-black">Encerramento do jogo</h3><p className="text-sm text-zinc-400">Salva presença, pagamentos, placar e estatísticas no histórico.</p></div><Button onClick={finishGameProfessional} className="bg-red-500 text-black">Encerrar jogo profissional</Button></div></div>

    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3">
      <h3 className="text-lg font-black">Novo lançamento</h3>
      <div className="grid grid-cols-1 md:grid-cols-[180px_160px_1fr_auto] gap-3 items-end">
        <Field label="Tipo">
          <select className={inputCls} value={cashForm.type} onChange={(e) => setCashForm({ ...cashForm, type: e.target.value })}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajustar saldo atual</option>
          </select>
        </Field>
        <Field label={cashForm.type === "ajuste" ? "Novo saldo" : "Valor"}>
          <input className={inputCls} type="number" step="0.01" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} />
        </Field>
        <Field label="Descrição">
          <input className={inputCls} placeholder="Ex: mensalidade, churrasco, aluguel da quadra..." value={cashForm.description} onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })} />
        </Field>
        <Button onClick={addCashMovement} className="bg-emerald-500 text-black">Lançar</Button>
      </div>
      <p className="text-xs text-zinc-500">Use “Ajustar saldo atual” quando quiser informar o saldo real do caixa sem precisar lançar todo o histórico anterior.</p>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-lg font-black">Pagamentos do jogo atual</h3>
        {mainPayers.length === 0 ? <p className="text-zinc-500">Nenhum pagante na lista principal.</p> : <div className="grid gap-2">{mainPayers.map((p) => <label key={p.id} className="flex justify-between bg-zinc-800 p-3 rounded-xl"><span>{displayName(p)}</span><span>Pago <input type="checkbox" checked={!!pay[p.id]} onChange={async (e) => { if (!canAccessCash) return; const value = e.target.checked; setPay({ ...pay, [p.id]: value }); await supabase.from("payments").upsert({ player_id: String(p.id), paid: value }); }} /></span></label>)}</div>}
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-lg font-black">Fluxo de caixa</h3>
        {cashMovements.length === 0 ? <p className="text-zinc-500">Nenhum lançamento no caixa.</p> : <div className="space-y-2 max-h-[420px] overflow-auto pr-1">{cashMovements.map((m) => <div key={m.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3 flex items-start justify-between gap-3">
          <div>
            <b className={Number(m.amount) >= 0 ? "text-emerald-400" : "text-red-400"}>{Number(m.amount) >= 0 ? "+" : ""}{money(m.amount)}</b>
            <p className="text-sm text-zinc-300">{m.description}</p>
            <p className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleString("pt-BR")} • {m.type} • saldo: {money(m.balance_after)}</p>
          </div>
          {isAdmin && <button className="text-red-400 text-xs font-bold" onClick={() => deleteCashMovement(m.id)}>Remover</button>}
        </div>)}</div>}
      </div>
    </div>
  </Box>}

  <BottomNavStable />

  {showMvpCalc && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-lg md:text-2xl font-black leading-tight">📊 Cálculo do MVP</h2><p className="text-zinc-400 text-sm">Gol = 2 • Assistência = 1 • Gol contra = -3</p></div><Button onClick={() => setShowMvpCalc(false)}>Fechar</Button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-zinc-400"><tr className="border-b border-zinc-700"><th className="text-left py-2">#</th><th className="text-left py-2">Atleta</th><th>Gols</th><th>Assist.</th><th className="text-red-400">Contra</th><th>Pontos</th></tr></thead><tbody>{getMvpRanking().slice(0, 5).map((row, i) => <tr key={row.name} className="border-b border-zinc-800"><td className="py-3 font-bold">{i + 1}</td><td className="py-3 font-black">{displayName(players.find((p) => p.name === row.name) || { name: row.name })}</td><td className="text-center">{row.goals}</td><td className="text-center">{row.assists}</td><td className="text-center text-red-400 font-bold">{row.ownGoals > 0 ? row.ownGoals + " (-3)" : row.ownGoals}</td><td className="text-center text-emerald-400 font-black">{row.points}</td></tr>)}{getMvpRanking().length === 0 && <tr><td colSpan="8" className="py-6 text-center text-zinc-500">Nenhuma jogada lançada ainda.</td></tr>}</tbody></table></div></div></div>}

  {deleteTarget && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"><div className="text-5xl">⚠️</div><h2 className="text-lg md:text-2xl font-black leading-tight">Remover jogador?</h2><p className="text-zinc-400 text-xs md:text-base">Tem certeza que deseja remover <b className="text-white">{displayName(deleteTarget)}</b>?</p><div className="flex gap-3 justify-end"><Button onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button onClick={confirmRemovePlayer} className="bg-red-500 text-black">Remover</Button></div></div></div>}
  </main>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><AppDosAmigosFC /></React.StrictMode>);
