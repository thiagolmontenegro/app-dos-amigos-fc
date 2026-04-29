import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

const env = import.meta?.env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://tvouiuulgqoutyvievui.supabase.co";
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2b3VpdXVsZ3FvdXR5dmlldnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjg4MjQsImV4cCI6MjA5MjYwNDgyNH0.0acxFA68_taheBcIq-y4bmyumxhvFV3amiVulQPavhI";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUPER_ADMIN_EMAIL = "thiagolmontenegro@gmail.com";

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
  const [newPassword, setNewPassword] = useState("");
  const [firstAccessMsg, setFirstAccessMsg] = useState("");

  const [dbMsg, setDbMsg] = useState("Conectando ao banco...");
  const [notice, setNotice] = useState("");
  const [liveEvents, setLiveEvents] = useState([]);
  const [pushStatus, setPushStatus] = useState("desativado");

  const [playerSearch, setPlayerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [listActive, setListActive] = useState(false);
  const [listLocked, setListLocked] = useState(false);
  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [gameTime, setGameTime] = useState("20:00");
  const [gameLocation, setGameLocation] = useState("");

  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState(["Azul", "Laranja", "Sem colete"]);
  const [teams, setTeams] = useState(null);
  const [initial, setInitial] = useState([]);

  const [price, setPrice] = useState(15);
  const [pay, setPay] = useState({});

  const [games, setGames] = useState([{ id: "1", a: 0, b: 1, sa: 0, sb: 0, goals: [], assists: [], fa: "", fb: "", aa: "", ab: "", ca: false, cb: false }]);
  const [mvp, setMvp] = useState("");
  const [showMvpCalc, setShowMvpCalc] = useState(false);

  const isSuperAdmin = String(user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

  const currentPlayer = useMemo(() => {
    if (!user) return null;
    const email = String(user.email || "").trim().toLowerCase();
    return players.find((p) => String(p.user_id || "") === String(user.id)) || players.find((p) => String(p.email || "").trim().toLowerCase() === email) || null;
  }, [players, user]);

  const isAdmin = isSuperAdmin || currentPlayer?.role === "admin";
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

  function notifyListChange(message) {
    setNotice(message);
    setLiveEvents((prev) => [{ id: Date.now(), message, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
    setTimeout(() => setNotice(""), 3500);
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification("App dos Amigos FC", { body: message });
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
    }));
    setPlayers(mapped);
    setDbMsg("Banco conectado");
    return mapped;
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
      setGameTime(settingsRes.data.game_time || "20:00");
      setGameLocation(settingsRes.data.game_location || "");
    }

    const paymentMap = {};
    (paymentsRes.data || []).forEach((p) => { paymentMap[String(p.player_id)] = !!p.paid; });
    setPay(paymentMap);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => authSub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => { loadAll(); }, []);

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

  async function signIn() {
    setAuthMsg("");
    const email = authForm.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: authForm.password });
    if (error) return setAuthMsg(error.message);
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
    setScreen("home");

    await saveSettings({ listActive: true, listLocked: false });
    await dbCall(() => supabase.from("players").upsert(reset));

    notifyListChange("Lista aberta. Todos voltaram para pendente.");
  }

  async function closeList() {
    if (!isAdmin) return notifyListChange("Ação permitida somente para Admin.");
    if (!window.confirm("Tem certeza que deseja fechar/bloquear a lista?")) return;
    setListLocked(true);
    await saveSettings({ listActive: true, listLocked: true });
    notifyListChange("Lista BLOQUEADA para novas entradas.");
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

  function Header() {
    const nav = [["home", "🏠 Início"], ["players", "👥 Jogadores"], ["newGame", "🆕 Novo jogo"], ["match", "⚽ Times"], ["cash", "💰 Caixa"]];

    return <header className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 sticky top-0 z-40 backdrop-blur">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div><h1 className="text-4xl md:text-5xl font-black tracking-tight">🏆 App dos Amigos FC</h1><p className={dbMsg === "Banco conectado" ? "text-emerald-400 text-sm font-bold" : "text-yellow-400 text-sm font-bold"}>{dbMsg}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={requestNotifications}>🔔 Push: {pushStatus}</Button>
          {isAdmin && <Button onClick={() => setMode(mode === "admin" ? "atleta" : "admin")} className={effectiveMode === "admin" ? "bg-emerald-500 text-black" : "bg-blue-500 text-black"}>{effectiveMode === "admin" ? "Modo Admin" : "Modo Atleta"}</Button>}
          {screen !== "home" && <Button onClick={() => setScreen("home")}>⬅ Voltar</Button>}
          <Button onClick={() => setHide(!hide)}>{hide ? "Mostrar níveis" : "Hide níveis"}</Button>
          {user && <Button onClick={signOut}>Sair</Button>}
        </div>
      </div>
      {effectiveMode === "admin" && <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">{nav.map(([key, label]) => <button key={key} onClick={() => setScreen(key)} className={`rounded-2xl px-3 py-3 font-black text-sm transition border ${screen === key ? "bg-emerald-500 text-black border-emerald-300" : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"}`}>{label}</button>)}</nav>}
    </header>;
  }

  function ListBoard() {
    const listDate = brDateFromInput(gameDate);

    return <Box title="📋 Lista ativa">
      {!listActive ? <div className="text-center py-10"><p className="text-3xl font-black">Nenhuma lista ativa</p><p className="text-zinc-400 mt-2">Aguardando o Admin abrir a lista do próximo jogo.</p></div> : <div className="space-y-5">
        <div className="bg-zinc-950 border border-emerald-800 rounded-3xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-zinc-800 pb-4 mb-4">
            <div><div className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 border ${listLocked ? "bg-red-950/50 border-red-700" : "bg-emerald-950/50 border-emerald-700"}`}><span className="text-3xl">{listLocked ? "⛔" : "🟢"}</span><h2 className="text-2xl font-black">{listLocked ? "Lista BLOQUEADA para novas entradas" : "Lista ABERTA"} - {listDate}</h2></div><p className="text-zinc-300 mt-3 text-lg">📍 {gameLocation || "Local não informado"} • 🕒 {gameTime}</p></div>
            <div className="text-xs text-zinc-400 bg-zinc-900 rounded-2xl p-3"><p>⚽ Quem vai no jogo</p><p>🍖⚽ Jogo + Resenha</p><p>🍖 Só Resenha</p></div>
          </div>
          <div className="space-y-2 font-mono text-sm md:text-base">{mainSlotPlayers.map((p, i) => <div key={i} className="flex items-center gap-2 bg-zinc-900/70 rounded-xl px-3 py-2"><span className="w-8 shrink-0">{i + 1}-</span><span className="w-7 shrink-0">{i < 2 ? "🥅" : ""}</span><span className="font-bold">{p ? displayName(p) : ""}</span>{p && <span>{statusEmoji(p)}</span>}{p && <span className="text-xs text-zinc-400 ml-2">{formatDateTime(p.updated_at)}</span>}</div>)}</div>
        </div>
        {reserveList.length > 0 && <div className="bg-yellow-950/30 border border-yellow-800 rounded-3xl p-5"><h3 className="text-xl font-black mb-3">🕒 Suplentes</h3>{reserveList.map((p, i) => <p key={p.id} className="py-1">{i + 1}- {displayName(p)} {statusEmoji(p)}</p>)}</div>}
        <div className="grid md:grid-cols-2 gap-4"><div className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800"><h3 className="text-xl font-black mb-3">Só Resenha</h3>{resenhaOnly.length ? resenhaOnly.map((p, i) => <p key={p.id}>{i + 1}- {displayName(p)} 🍖</p>) : <p className="text-zinc-500">Nenhum confirmado só para resenha.</p>}</div><div className="bg-red-950/30 rounded-3xl p-5 border border-red-800"><h3 className="text-xl font-black mb-3">Ausentes</h3>{absentList.length ? absentList.map((p, i) => <p key={p.id}>{i + 1}- {displayName(p)}</p>) : <p className="text-zinc-500">Nenhum ausente.</p>}</div></div>
      </div>}
    </Box>;
  }

  if (!user) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"><div className="text-center space-y-2"><div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-5xl shadow-2xl border border-white/20">⚽</div><h1 className="text-3xl font-black">App dos Amigos FC</h1><p className="text-zinc-400">Entre ou crie seu acesso.</p></div>{authView === "signup" && <><Field label="Nome completo"><input className={inputCls} value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value.toUpperCase() })} /></Field><Field label="Nome/Apelido (lista)"><input className={inputCls} value={authForm.nickname} onChange={(e) => setAuthForm({ ...authForm, nickname: e.target.value.toUpperCase() })} /></Field></>}<Field label="E-mail"><input className={inputCls} type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></Field><Field label="Senha"><input className={inputCls} type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></Field>{authView === "signup" && <Field label="Posição"><select className={inputCls} value={authForm.position} onChange={(e) => setAuthForm({ ...authForm, position: e.target.value })}><option value="Linha">Linha</option><option value="Goleiro">Gol</option></select></Field>}{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={authView === "login" ? signIn : signUp} className="bg-emerald-500 text-black w-full">{authView === "login" ? "Entrar" : "Criar acesso"}</Button><button className="text-sm text-emerald-400 font-bold w-full" onClick={() => setAuthView(authView === "login" ? "signup" : "login")}>{authView === "login" ? "Criar novo acesso" : "Já tenho acesso"}</button></div></main>;

  if (user && !currentPlayer && !isSuperAdmin) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md text-center space-y-4"><h1 className="text-3xl font-black">Cadastro não vinculado</h1><p className="text-zinc-400">Seu login existe, mas ainda não está ligado ao cadastro de jogadores.</p><p className="text-sm text-zinc-500">E-mail logado: {user.email}</p>{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={linkCurrentUserByEmail} className="bg-emerald-500 text-black w-full">Vincular automaticamente pelo e-mail</Button><Button onClick={signOut}>Sair</Button></div></main>;
  if (currentPlayer?.must_change_password) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4"><h1 className="text-3xl font-black">Trocar senha</h1><p className="text-zinc-400">Este login foi criado pelo Admin. Defina sua senha definitiva para continuar.</p><Field label="Nova senha"><input className={inputCls} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>{firstAccessMsg && <p className={firstAccessMsg.startsWith("Troca") ? "text-emerald-400 text-sm font-bold" : "text-yellow-400 text-sm font-bold"}>{firstAccessMsg}</p>}{authMsg && <p className="text-yellow-400 text-sm font-bold">{authMsg}</p>}<Button onClick={changeFirstPassword} className="bg-emerald-500 text-black w-full">Salvar nova senha</Button><Button onClick={signOut}>Sair</Button></div></main>;
  if (!isAdmin && currentPlayer && currentPlayer.approved === false) return <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md text-center space-y-4"><h1 className="text-3xl font-black">Aguardando aprovação</h1><p className="text-zinc-400">Seu acesso foi criado, mas ainda precisa ser aprovado pelo Admin.</p><Button onClick={signOut}>Sair</Button></div></main>;

  return <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6"><Header />{notice && <div className="bg-emerald-500 text-black rounded-2xl p-3 font-bold shadow-xl">{notice}</div>}{screen === "home" && <div className="space-y-6">{liveEvents.length > 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-2"><h3 className="font-black text-white">🔔 Atualizações em tempo real</h3>{liveEvents.map((e) => <p key={e.id} className="text-sm text-zinc-300"><span className="text-emerald-400 font-bold">{e.time}</span> — {e.message}</p>)}</div>}<ListBoard />{effectiveMode === "atleta" && <Box title="🙋 Confirmar presença">
        {!listActive && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-zinc-300 font-bold">
            ⏳ Não existe nenhuma lista aberta, aguarde a liberação para alterar seu status.
          </div>
        )}

        {listActive && !listLocked && (
          <div className={mainGamePlayers.length >= 14 ? "bg-yellow-950/50 border border-yellow-700 rounded-2xl p-4 text-yellow-300 font-bold" : "bg-emerald-950/50 border border-emerald-700 rounded-2xl p-4 text-emerald-300 font-bold"}>
            {mainGamePlayers.length >= 14
              ? "✅ Lista principal completa: próximos confirmados entram como suplentes."
              : `🟢 Lista aberta: ${Math.max(0, 14 - mainGamePlayers.length)} vaga(s) restantes.`}
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
              <Button disabled={!listActive || listLocked} onClick={() => updatePlayerStatus(currentPlayer.id, "jogo")} className="bg-blue-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                ⚽ Vou no jogo
              </Button>

              <Button disabled={!listActive || listLocked} onClick={() => updatePlayerStatus(currentPlayer.id, "jogo_resenha")} className="bg-emerald-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                🍖⚽ Jogo + Resenha
              </Button>

              <Button disabled={!listActive || listLocked} onClick={() => updatePlayerStatus(currentPlayer.id, "resenha")} className="disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
                🍖 Só Resenha
              </Button>

              <Button disabled={!listActive || listLocked} onClick={() => updatePlayerStatus(currentPlayer.id, "nao_vou")} className="bg-red-500 text-black disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100">
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
      </Box>}{effectiveMode === "admin" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><button onClick={() => setScreen("players")} className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-3xl p-8 text-left shadow-2xl"><div className="text-5xl mb-4">👥</div><h2 className="text-2xl font-black">Jogadores</h2><p className="text-zinc-400">Cadastrar, editar e remover.</p></button><button onClick={() => setScreen("newGame")} className="bg-gradient-to-br from-emerald-950/70 to-zinc-900 border border-emerald-700 rounded-3xl p-8 text-left shadow-2xl"><div className="text-5xl mb-4">🆕</div><h2 className="text-2xl font-black">Novo jogo</h2><p className="text-zinc-400">Presença, times e sorteio.</p></button><button onClick={() => setScreen("match")} className="bg-gradient-to-br from-blue-950/70 to-zinc-900 border border-blue-700 rounded-3xl p-8 text-left shadow-2xl"><div className="text-5xl mb-4">⚽</div><h2 className="text-2xl font-black">Times</h2><p className="text-zinc-400">Times sorteados.</p></button><button onClick={() => setScreen("cash")} className="bg-gradient-to-br from-yellow-950/70 to-zinc-900 border border-yellow-700 rounded-3xl p-8 text-left shadow-2xl"><div className="text-5xl mb-4">💰</div><h2 className="text-2xl font-black">Caixa</h2><p className="text-zinc-400">Pagos e pendentes.</p></button></div>}</div>}

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
<p className="text-xs text-zinc-400 -mt-2">Para criar login, informe e-mail e senha temporária. No primeiro acesso o atleta será obrigado a trocar a senha.</p><div className="grid md:grid-cols-[1fr_auto] gap-3 items-end"><Field label="Buscar jogador"><input className={inputCls} value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} /></Field><Field label="Filtro"><select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="todos">Todos</option>{statusList.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</select></Field></div><div className="overflow-x-auto"><table className="w-full text-sm border-separate border-spacing-y-2"><thead className="text-zinc-400"><tr><th className="text-left px-3">#</th><th className="text-left px-3">Nome</th><th className="text-left px-3">Apelido</th><th className="text-left px-3">E-mail</th><th>Nível</th><th>Posição</th><th className="text-right px-3">Ações</th></tr></thead><tbody>{visiblePlayers.length === 0 && <tr><td colSpan="7" className="text-center text-zinc-400 py-8">Nenhum jogador carregado. Clique em “Recarregar jogadores do banco”.</td></tr>}{visiblePlayers.map((p, i) => <tr key={p.id} className="bg-zinc-900 border border-zinc-800"><td className="p-3 rounded-l-xl text-zinc-400 font-bold">{i + 1}</td><td className="p-3 font-bold">{p.name}</td><td className="p-3 font-bold text-emerald-300">{displayName(p)}</td><td className="p-3 text-zinc-400">{p.email || "-"}</td><td className="text-center">{hide ? "•••" : p.level}</td><td className="text-center">{p.position}</td><td className="text-right p-3 rounded-r-xl"><button className="text-blue-300 font-bold mr-3" onClick={() => { setEditId(p.id); setForm({ name: p.name, nickname: p.nickname || "", email: p.email || "", tempPassword: "", level: p.level, position: p.position }); }}>Editar</button>{p.approved === false && <button className="text-emerald-400 font-bold mr-3" onClick={() => approvePlayer(p.id)}>Aprovar</button>}{!(String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && !isSuperAdmin) && <button className="text-yellow-300 font-bold mr-3" onClick={() => setAdminRole(p.id)}>{p.role === "admin" ? "Tirar admin" : "Tornar admin"}</button>}{!(String(p.email || "").toLowerCase() === SUPER_ADMIN_EMAIL && !isSuperAdmin) && <button className="text-red-400 font-bold" onClick={() => askRemovePlayer(p)}>Remover</button>}</td></tr>)}</tbody></table></div></Box>}

  {screen === "newGame" && <div className="grid lg:grid-cols-3 gap-6"><Box title="🆕 Novo jogo"><div className="grid md:grid-cols-2 gap-3"><Field label="Data"><input className={inputCls} type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} /></Field><Field label="Horário"><input className={inputCls} type="time" value={gameTime} onChange={(e) => { setGameTime(e.target.value); saveSettings({ gameTime: e.target.value }); }} /></Field><Field label="Local"><input className={inputCls} value={gameLocation} onChange={(e) => { setGameLocation(e.target.value); saveSettings({ gameLocation: e.target.value }); }} /></Field><Field label="Modo de Jogo"><select className={inputCls} value={teamCount} onChange={(e) => { const v = Number(e.target.value); setTeamCount(v); saveSettings({ teamCount: v }); }}><option value={2}>2 times + reservas</option><option value={3} disabled={activeLine.length < 12}>3 times</option></select>{activeLine.length < 12 && <p className="text-xs text-yellow-400 mt-1">3 times libera com 12 jogadores de linha confirmados.</p>}</Field><Field label="Valor por atleta"><input className={inputCls} type="number" value={price} onChange={(e) => { const v = Number(e.target.value || 0); setPrice(v); saveSettings({ price: v }); }} /></Field></div><div className="grid md:grid-cols-3 gap-3">{Array.from({ length: Number(teamCount) }).map((_, i) => <Field key={i} label={`Nome do time ${i + 1}`}><input className={inputCls} value={teamNames[i] || ""} onChange={(e) => { const names = teamNames.map((n, x) => x === i ? e.target.value : n); setTeamNames(names); saveSettings({ teamNames: names }); }} /></Field>)}</div><div className="grid md:grid-cols-3 gap-2"><Button onClick={openList} className="bg-blue-500 text-black w-full">Abrir lista</Button><Button onClick={closeList} className="bg-red-500 text-black w-full">Fechar/Bloquear lista</Button><Button onClick={drawTeams} className="bg-emerald-500 text-black w-full">Sortear times</Button></div></Box><Box title="Resumo"><div className="grid grid-cols-2 gap-3"><StatCard label="Jogo" value={mainGamePlayers.length} /><StatCard label="Resenha" value={mainGamePlayers.filter((p) => p.status === "jogo_resenha").length + resenhaOnly.length} /><StatCard label="Pagantes" value={mainPayers.length} /><StatCard label="Arrecadação" value={money(expected)} /></div></Box></div>}

  {screen === "match" && <div className="space-y-6"><Box title="🔥 Times sorteados">{Array.isArray(teams) ? <><div className={teamCount === 3 ? "grid md:grid-cols-3 gap-3" : "grid md:grid-cols-2 gap-3"}>{teams.map((team, i) => { const tag = teamTag(teamNames[i]); return <div key={i} className="bg-zinc-800 rounded-3xl p-4 border border-zinc-700"><div className="flex justify-between items-center mb-3"><b className="text-xl">{teamNames[i]}</b><span className={`${tag.color} px-3 py-1 rounded-xl font-black`}>{tag.short}</span></div><p className="text-xs text-zinc-400 mb-2">Força: {team.score}</p>{team.players.map((p) => <p key={p.id} className="uppercase text-sm">{displayName(p)} {p.position === "Goleiro" ? "🧤" : ""}</p>)}{team.reserves?.length > 0 && <div className="mt-3 border-t border-zinc-700 pt-2"><p className="text-xs text-yellow-400 font-bold">Reservas</p>{team.reserves.map((p) => <p key={p.id} className="uppercase text-xs text-yellow-300">{displayName(p)}</p>)}</div>}</div>; })}</div>{teamCount === 3 && <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3 mt-4"><Button onClick={drawInitialMatch} className="bg-blue-500 text-black w-full">Sortear jogo inicial</Button><div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">{[0, 1].map((slot) => { const idx = initial[slot]; const tag = teamTag(teamNames[idx]); return <div key={slot} className={`h-24 rounded-2xl flex flex-col items-center justify-center font-black shadow-xl ${idx !== undefined ? tag.color : "bg-zinc-800"}`}><span className="text-4xl leading-none">{idx !== undefined ? tag.short : "?"}</span>{idx !== undefined && <small>{teamNames[idx]}</small>}</div>; })}<b className="text-4xl text-white text-center">X</b></div></div>}</> : <p className="text-zinc-400">Nenhum time sorteado ainda.</p>}</Box>{Array.isArray(teams) && <Box title="⚽ Partidas"><div className="flex justify-between gap-3 flex-wrap"><p className="text-zinc-400">Lance placar, gols e assistências.</p><Button onClick={() => setGames((prev) => [...prev, { id: String(Date.now()), a: 0, b: 1, sa: 0, sb: 0, goals: [], assists: [], fa: "", fb: "", aa: "", ab: "", ca: false, cb: false }])} className="bg-emerald-500 text-black">+ Gerar jogo</Button></div>{games.map((game) => <div key={game.id} className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-5 shadow-2xl"><div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"><Field label="Time 1"><select className={inputCls} value={game.a} onChange={(e) => updateGame(game.id, { a: Number(e.target.value) })}>{teams.map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field><Field label="Gols"><input className={`${inputCls} text-5xl text-center font-black`} type="number" value={game.sa} onChange={(e) => updateGame(game.id, { sa: Number(e.target.value || 0) })} /></Field><b className="text-center text-5xl text-emerald-400">X</b><Field label="Gols"><input className={`${inputCls} text-5xl text-center font-black`} type="number" value={game.sb} onChange={(e) => updateGame(game.id, { sb: Number(e.target.value || 0) })} /></Field><Field label="Time 2"><select className={inputCls} value={game.b} onChange={(e) => updateGame(game.id, { b: Number(e.target.value) })}>{teams.map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field></div><div className="grid md:grid-cols-2 gap-4">{renderSide(game, 0)}{renderSide(game, 1)}</div></div>)}<div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end"><Field label="Craque do jogo"><select className={inputCls} value={mvp} onChange={(e) => setMvp(e.target.value)}><option value="">Selecione</option>{mainGamePlayers.map((p) => <option key={p.id} value={p.name}>{displayName(p)}</option>)}</select></Field><Button onClick={autoMvp} className="bg-emerald-500 text-black">MVP automático</Button><Button onClick={() => setShowMvpCalc(true)} className="bg-blue-500 text-black">Ver cálculo MVP</Button></div></Box>}</div>}

  {screen === "cash" && <Box title="💰 Caixa"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><StatCard label="Pagantes" value={mainPayers.length} /><StatCard label="Estimado" value={money(expected)} /><StatCard label="Pago" value={money(paid)} /><StatCard label="Pendente" value={money(Math.max(0, expected - paid))} tone={expected - paid ? "bg-red-950/60" : "bg-emerald-950/60"} /></div><div className="grid md:grid-cols-2 gap-2">{mainPayers.map((p) => <label key={p.id} className="flex justify-between bg-zinc-800 p-3 rounded-xl"><span>{displayName(p)}</span><span>Pago <input type="checkbox" checked={!!pay[p.id]} onChange={async (e) => { if (!isAdmin) return; const value = e.target.checked; setPay({ ...pay, [p.id]: value }); await supabase.from("payments").upsert({ player_id: String(p.id), paid: value }); }} /></span></label>)}</div></Box>}

  {showMvpCalc && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">📊 Cálculo do MVP</h2><p className="text-zinc-400 text-sm">Gol = 2 • Assistência = 1 • Gol contra = -3</p></div><Button onClick={() => setShowMvpCalc(false)}>Fechar</Button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-zinc-400"><tr className="border-b border-zinc-700"><th className="text-left py-2">#</th><th className="text-left py-2">Atleta</th><th>Gols</th><th>Assist.</th><th className="text-red-400">Contra</th><th>Pontos</th></tr></thead><tbody>{getMvpRanking().slice(0, 5).map((row, i) => <tr key={row.name} className="border-b border-zinc-800"><td className="py-3 font-bold">{i + 1}</td><td className="py-3 font-black">{displayName(players.find((p) => p.name === row.name) || { name: row.name })}</td><td className="text-center">{row.goals}</td><td className="text-center">{row.assists}</td><td className="text-center text-red-400 font-bold">{row.ownGoals > 0 ? row.ownGoals + " (-3)" : row.ownGoals}</td><td className="text-center text-emerald-400 font-black">{row.points}</td></tr>)}{getMvpRanking().length === 0 && <tr><td colSpan="7" className="py-6 text-center text-zinc-500">Nenhuma jogada lançada ainda.</td></tr>}</tbody></table></div></div></div>}

  {deleteTarget && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"><div className="text-5xl">⚠️</div><h2 className="text-2xl font-black">Remover jogador?</h2><p className="text-zinc-400">Tem certeza que deseja remover <b className="text-white">{displayName(deleteTarget)}</b>?</p><div className="flex gap-3 justify-end"><Button onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button onClick={confirmRemovePlayer} className="bg-red-500 text-black">Remover</Button></div></div></div>}
  </main>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><AppDosAmigosFC /></React.StrictMode>);
