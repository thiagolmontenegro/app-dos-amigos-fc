import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://tvouiuulgqoutyvievui.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "COLE_SUA_ANON_KEY_NO_ENV";
const supabase = createClient(supabaseUrl, supabaseKey);

const initialPlayers = [
  { id: "1", name: "Marcelo", level: 5, position: "Linha", status: "jogo_resenha" },
  { id: "2", name: "Fabio", level: 5, position: "Linha", status: "jogo" },
  { id: "3", name: "Tierre", level: 4, position: "Linha", status: "jogo" },
  { id: "4", name: "Mario", level: 3, position: "Linha", status: "jogo_resenha" },
  { id: "5", name: "Rodrigo", level: 3, position: "Linha", status: "resenha" },
  { id: "6", name: "Alex Sandro", level: 3, position: "Linha", status: "jogo_resenha" },
  { id: "7", name: "Jonathan", level: 3, position: "Linha", status: "jogo_resenha" },
  { id: "8", name: "Pablo", level: 2, position: "Linha", status: "jogo" },
  { id: "9", name: "Dan", level: 3, position: "Linha", status: "jogo_resenha" },
  { id: "10", name: "Germano", level: 4, position: "Linha", status: "jogo_resenha" },
  { id: "11", name: "Thiago", level: 3, position: "Linha", status: "jogo_resenha" },
  { id: "12", name: "Paraíba", level: 3, position: "Goleiro", status: "jogo" },
  { id: "13", name: "Cadinho", level: 4, position: "Goleiro", status: "jogo" }
];

const statusList = [
  ["pendente", "Falta confirmar"],
  ["jogo", "Jogo"],
  ["jogo_resenha", "Jogo + Resenha"],
  ["resenha", "Só resenha"],
  ["nao_vou", "Não vou"]
];

const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-400";
const buttonCls = "rounded-xl px-4 py-2 font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-40";

function isGame(player) { return player.status === "jogo" || player.status === "jogo_resenha"; }
function isAfter(player) { return player.status === "resenha" || player.status === "jogo_resenha"; }
function isPayer(player) { return isGame(player) && player.position !== "Goleiro"; }
function money(value) { return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`; }
function shuffle(list) { return [...list].map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map((x) => x.item); }
function newGame(id) { return { id: String(id), a: 0, b: 1, sa: 0, sb: 0, fa: "", fb: "", aa: "", ab: "", ca: false, cb: false, goals: [], assists: [] }; }

function teamTag(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("azul")) return { short: "AZU", color: "bg-blue-600" };
  if (value.includes("laranja")) return { short: "LAR", color: "bg-orange-500" };
  if (value.includes("verde")) return { short: "VER", color: "bg-green-600" };
  if (value.includes("sem") || value.includes("colete")) return { short: "S/COL", color: "bg-zinc-500" };
  return { short: String(name || "TIM").slice(0, 3).toUpperCase(), color: "bg-zinc-700" };
}

function rowClass(status) {
  if (status === "jogo") return "bg-blue-950/40 border-blue-800/50";
  if (status === "jogo_resenha") return "bg-emerald-950/40 border-emerald-800/50";
  if (status === "resenha") return "bg-yellow-950/40 border-yellow-800/50";
  if (status === "nao_vou") return "bg-red-950/40 border-red-800/50";
  return "bg-zinc-900 border-zinc-800";
}

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`${buttonCls} ${className}`}>{children}</button>;
}

function Box({ title, children, className = "" }) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-5 space-y-4 ${className}`}>
      <h2 className="text-xl font-black text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return <label className="text-sm text-zinc-400 space-y-1 block"><span>{label}</span>{children}</label>;
}

function sortPlayers(players) {
  const order = { jogo: 1, jogo_resenha: 1, resenha: 2, nao_vou: 3, pendente: 4 };
  return [...players].sort((a, b) => {
    const byStatus = (order[a.status] || 9) - (order[b.status] || 9);
    if (byStatus !== 0) return byStatus;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

async function dbCall(fn) {
  try {
    const result = await fn();
    if (result?.error) console.error("Supabase:", result.error.message || result.error);
    return result;
  } catch (error) {
    console.error("Erro Supabase:", error?.message || error);
    return { error };
  }
}

export default function AppDosAmigosFC() {
  const [players, setPlayers] = useState(initialPlayers);
  const [form, setForm] = useState({ name: "", level: 3, position: "Linha", status: "pendente" });
  const [editId, setEditId] = useState(null);
  const [hide, setHide] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [teamSize, setTeamSize] = useState(5);
  const [teamNames, setTeamNames] = useState(["Azul", "Laranja", "Sem colete"]);
  const [teams, setTeams] = useState(null);
  const [initial, setInitial] = useState([]);
  const [price, setPrice] = useState(15);
  const [screen, setScreen] = useState("main");
  const [games, setGames] = useState([newGame(1)]);
  const [history, setHistory] = useState([]);
  const [pay, setPay] = useState({});
  const [err, setErr] = useState("");
  const [dbMsg, setDbMsg] = useState("Conectando ao banco...");
  const [loading, setLoading] = useState(false);
  const [splash, setSplash] = useState(true);
  const [rankMonth, setRankMonth] = useState(new Date().toISOString().slice(0, 7));
  const [installPrompt, setInstallPrompt] = useState(null);

  const confirmed = players.filter(isGame);
  const after = players.filter(isAfter);
  const payers = players.filter(isPayer);
  const pending = players.filter((p) => p.status === "pendente");
  const expected = payers.length * Number(price || 0);
  const paid = payers.filter((p) => pay[p.id]).length * Number(price || 0);
  const pend = Math.max(0, expected - paid);
  const sorted = useMemo(() => sortPlayers(players), [players]);

  const monthHistory = useMemo(() => {
    if (!rankMonth) return history;
    const [year, month] = rankMonth.split("-");
    const suffix = `/${month}/${year}`;
    return history.filter((h) => String(h.date || "").endsWith(suffix));
  }, [history, rankMonth]);

  const stats = useMemo(() => {
    const allGoals = monthHistory.flatMap((h) => h.goals || []);
    const allAssists = monthHistory.flatMap((h) => h.assists || []);
    return players.map((player) => {
      const presences = monthHistory.filter((h) => (h.present || []).includes(player.name)).length;
      return {
        name: player.name,
        goals: allGoals.filter((g) => g.p === player.name).length,
        assists: allAssists.filter((a) => a.p === player.name).length,
        presences,
        absences: monthHistory.length - presences
      };
    }).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name, "pt-BR"));
  }, [players, monthHistory]);

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [playersRes, gamesRes, paymentsRes, settingsRes, lineupRes] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("games").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("lineups").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]);

      if (playersRes.error || gamesRes.error || paymentsRes.error) {
        setDbMsg("Erro ao carregar banco. Verifique RLS/policies/tabelas.");
        console.error(playersRes.error || gamesRes.error || paymentsRes.error);
        setLoading(false);
        return;
      }

      if (playersRes.data?.length) {
        setPlayers(playersRes.data.map((p) => ({
          id: String(p.id),
          name: p.name,
          level: Number(p.level || 3),
          position: p.position || "Linha",
          status: p.status || "pendente"
        })));
      }

      if (gamesRes.data?.length) {
        const ids = gamesRes.data.map((g) => String(g.id));
        const [goalsRes, assistsRes] = await Promise.all([
          supabase.from("goals").select("*").in("game_id", ids),
          supabase.from("assists").select("*").in("game_id", ids)
        ]);

        const goalRows = goalsRes.data || [];
        const assistRows = assistsRes.data || [];
        setHistory(gamesRes.data.map((g) => ({
          id: String(g.id),
          date: g.date,
          names: [g.team_a, g.team_b],
          sa: Number(g.score_a || 0),
          sb: Number(g.score_b || 0),
          present: g.present || [],
          revenue: Number(g.revenue || 0),
          goals: goalRows.filter((x) => String(x.game_id) === String(g.id)).map((x) => ({ p: x.player_name, teamName: x.team_name, c: !!x.is_against })),
          assists: assistRows.filter((x) => String(x.game_id) === String(g.id)).map((x) => ({ p: x.player_name, teamName: x.team_name, c: !!x.is_against }))
        })));
      }

      const paymentMap = {};
      (paymentsRes.data || []).forEach((p) => { paymentMap[String(p.player_id)] = !!p.paid; });
      setPay(paymentMap);

      if (settingsRes.data) {
        setTeamCount(Number(settingsRes.data.team_count || 2));
        setTeamSize(Number(settingsRes.data.team_size || 5));
        setTeamNames(settingsRes.data.team_names || ["Azul", "Laranja", "Sem colete"]);
        setPrice(Number(settingsRes.data.price || 15));
      }

      if (lineupRes.data?.teams) {
        setTeams(lineupRes.data.teams);
        setTeamNames(lineupRes.data.team_names || ["Azul", "Laranja", "Sem colete"]);
        setTeamCount(Number(lineupRes.data.team_count || 2));
        setTeamSize(Number(lineupRes.data.team_size || 5));
      }

      setDbMsg("Banco conectado");
      setLoading(false);
    }

    loadAll();
  }, []);

  async function saveSettings(patch = {}) {
    const data = {
      id: 1,
      team_count: patch.teamCount ?? teamCount,
      team_size: patch.teamSize ?? teamSize,
      team_names: patch.teamNames ?? teamNames,
      price: patch.price ?? Number(price || 0)
    };
    await dbCall(() => supabase.from("settings").upsert(data));
  }

  async function savePlayer() {
    const name = form.name.trim();
    if (!name) return;
    const player = {
      id: editId || String(Date.now()),
      name,
      level: Number(form.level || 3),
      position: form.position,
      status: form.status
    };
    setPlayers(editId ? players.map((p) => p.id === editId ? player : p) : [...players, player]);
    setForm({ name: "", level: 3, position: "Linha", status: "pendente" });
    setEditId(null);
    await dbCall(() => supabase.from("players").upsert(player));
  }

  async function updatePlayerStatus(id, status) {
    const updated = players.map((p) => p.id === id ? { ...p, status } : p);
    const player = updated.find((p) => p.id === id);
    setPlayers(updated);
    await dbCall(() => supabase.from("players").upsert(player));
  }

  async function removePlayer(id) {
    setPlayers(players.filter((p) => p.id !== id));
    await dbCall(() => supabase.from("players").delete().eq("id", id));
  }

  async function drawTeams() {
    const count = Number(teamCount);
    const size = Number(teamSize);
    const pool = count === 3 ? confirmed.filter((p) => p.position !== "Goleiro") : confirmed;
    const need = count * size;

    if (pool.length < need) {
      setTeams({ error: `Faltam atletas. Precisa de ${need}.` });
      return;
    }

    const result = Array.from({ length: count }, () => ({ players: [], score: 0 }));

    if (count === 2) {
      shuffle(pool.filter((p) => p.position === "Goleiro")).slice(0, 2).forEach((goalkeeper, index) => {
        result[index].players.push(goalkeeper);
        result[index].score += goalkeeper.level;
      });
    }

    const used = new Set(result.flatMap((team) => team.players.map((p) => p.id)));
    const remaining = shuffle(pool.filter((p) => !used.has(p.id))).sort((a, b) => b.level - a.level).slice(0, need - used.size);

    remaining.forEach((player) => {
      const target = result.filter((team) => team.players.length < size).sort((a, b) => a.score - b.score)[0];
      target.players.push(player);
      target.score += player.level;
    });

    setTeams(result);
    setInitial([]);

    await dbCall(() => supabase.from("lineups").insert({
      id: String(Date.now()),
      teams: result,
      team_names: teamNames,
      team_count: Number(teamCount),
      team_size: Number(teamSize)
    }));
  }

  function teamPlayers(index) {
    return Array.isArray(teams) && teams[index] ? teams[index].players : confirmed;
  }

  function updateGame(id, patch) {
    setGames(games.map((game) => game.id === id ? { ...game, ...patch } : game));
  }

  function addPlay(game, side) {
    const teamIndex = side === 0 ? game.a : game.b;
    const scorer = side === 0 ? game.fa : game.fb;
    const assist = side === 0 ? game.aa : game.ab;
    const against = side === 0 ? game.ca : game.cb;

    if (!scorer && !assist) return;

    const patch = {
      goals: scorer ? [...game.goals, { p: scorer, t: teamIndex, teamName: teamNames[teamIndex], c: against }] : game.goals,
      assists: assist ? [...game.assists, { p: assist, t: teamIndex, teamName: teamNames[teamIndex], c: against }] : game.assists
    };

    Object.assign(patch, side === 0 ? { fa: "", aa: "", ca: false } : { fb: "", ab: "", cb: false });
    updateGame(game.id, patch);
  }

  async function saveGames() {
    setErr("");

    for (const game of games) {
      const scoreTotal = Number(game.sa) + Number(game.sb);
      if (game.a === game.b) return setErr("Escolha times diferentes.");
      if (scoreTotal <= 0) return setErr("Informe o placar.");
      if (game.goals.length !== scoreTotal) return setErr(`Gols lançados (${game.goals.length}) não batem com placar (${scoreTotal}).`);
      if (game.goals.filter((g) => g.t === game.a).length !== Number(game.sa)) return setErr(`Gols do ${teamNames[game.a]} não batem.`);
      if (game.goals.filter((g) => g.t === game.b).length !== Number(game.sb)) return setErr(`Gols do ${teamNames[game.b]} não batem.`);
    }

    const present = confirmed.map((p) => p.name);
    const saved = games.map((game) => ({
      ...game,
      id: String(Date.now() + Math.random()),
      date: new Date().toLocaleDateString("pt-BR"),
      names: [teamNames[game.a], teamNames[game.b]],
      present,
      revenue: expected
    }));

    setHistory([...saved, ...history]);
    setGames([newGame(Date.now())]);

    await dbCall(async () => {
      const gamesToSave = saved.map((game) => ({
        id: game.id,
        date: game.date,
        team_a: game.names[0],
        team_b: game.names[1],
        score_a: Number(game.sa),
        score_b: Number(game.sb),
        present: game.present,
        revenue: Number(game.revenue || 0)
      }));

      const goalsToSave = saved.flatMap((game) => game.goals.map((goal) => ({
        game_id: game.id,
        player_name: goal.p,
        team_name: goal.teamName || teamNames[goal.t],
        is_against: !!goal.c
      })));

      const assistsToSave = saved.flatMap((game) => game.assists.map((assist) => ({
        game_id: game.id,
        player_name: assist.p,
        team_name: assist.teamName || teamNames[assist.t],
        is_against: !!assist.c
      })));

      const gameResult = await supabase.from("games").insert(gamesToSave);
      if (gameResult.error) return gameResult;

      if (goalsToSave.length) {
        const goalResult = await supabase.from("goals").insert(goalsToSave);
        if (goalResult.error) return goalResult;
      }

      if (assistsToSave.length) {
        const assistResult = await supabase.from("assists").insert(assistsToSave);
        if (assistResult.error) return assistResult;
      }

      return { error: null };
    });
  }

  async function updatePayment(playerId, paidValue) {
    setPay({ ...pay, [playerId]: paidValue });
    await dbCall(() => supabase.from("payments").upsert({ player_id: String(playerId), paid: paidValue }));
  }

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function exportCSV() {
    const rows = [["Atleta", "Gols", "Assistencias", "Presencas", "Faltas"]];
    stats.forEach((s) => rows.push([s.name, s.goals, s.assists, s.presences, s.absences]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking-${rankMonth || "geral"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderSide(game, side) {
    const teamIndex = side === 0 ? game.a : game.b;
    const against = side === 0 ? game.ca : game.cb;
    const list = against ? confirmed : teamPlayers(teamIndex);
    const goalKey = side === 0 ? "fa" : "fb";
    const assistKey = side === 0 ? "aa" : "ab";
    const againstKey = side === 0 ? "ca" : "cb";
    const goalsText = game.goals.filter((g) => g.t === teamIndex).map((g) => g.p).join(", ") || "-";
    const assistsText = game.assists.filter((a) => a.t === teamIndex).map((a) => a.p).join(", ") || "-";

    return (
      <div className="bg-zinc-800 p-4 rounded-2xl space-y-3">
        <h4 className="text-xl font-black uppercase text-white">{teamNames[teamIndex]}</h4>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={against} onChange={(e) => updateGame(game.id, { [againstKey]: e.target.checked })} />
          Gol/assistência contra — liberar todos
        </label>
        <Field label="Quem fez o gol">
          <select className={inputCls} value={game[goalKey]} onChange={(e) => updateGame(game.id, { [goalKey]: e.target.value })}>
            <option value="">Selecione</option>
            {list.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Quem deu assistência">
          <select className={inputCls} value={game[assistKey]} onChange={(e) => updateGame(game.id, { [assistKey]: e.target.value })}>
            <option value="">Sem assistência</option>
            {list.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Button onClick={() => addPlay(game, side)} className="w-full">Adicionar jogada</Button>
        <div className="text-xs text-zinc-400">
          <p><b>Gols:</b> {goalsText}</p>
          <p><b>Assistências:</b> {assistsText}</p>
        </div>
      </div>
    );
  }

  if (splash) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-5 animate-pulse">
          <img src="/icon-192.png" alt="App dos Amigos FC" className="w-28 h-28 mx-auto rounded-3xl shadow-2xl" />
          <div>
            <h1 className="text-4xl font-black">App dos Amigos FC</h1>
            <p className="text-emerald-400 font-bold">Carregando o jogo...</p>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "cash") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-5">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-black">💰 Encerrar jogo</h1>
          <Button onClick={() => setScreen("main")}>Voltar</Button>
        </header>
        <Box title="Caixa do jogo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Pagantes</p><b className="text-2xl">{payers.length}</b></div>
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Estimado</p><b className="text-2xl">{money(expected)}</b></div>
            <div className="bg-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Pago</p><b className="text-2xl">{money(paid)}</b></div>
            <div className={`rounded-xl p-4 ${pend ? "bg-red-950/60" : "bg-emerald-950/60"}`}><p className="text-xs text-zinc-300">Pendente</p><b className="text-2xl">{money(pend)}</b></div>
          </div>
          <Field label="Valor por atleta">
            <input className={inputCls} type="number" value={price} onChange={(e) => { const value = Number(e.target.value || 0); setPrice(value); saveSettings({ price: value }); }} />
          </Field>
          <div className="grid md:grid-cols-2 gap-2">
            {payers.map((p) => (
              <label key={p.id} className="flex justify-between bg-zinc-800 p-3 rounded-xl">
                <span>{p.name}</span>
                <span>Pago <input type="checkbox" checked={!!pay[p.id]} onChange={(e) => updatePayment(p.id, e.target.checked)} /></span>
              </label>
            ))}
          </div>
          <Button disabled={pend > 0} className="bg-emerald-500 text-black">Fechar caixa</Button>
        </Box>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black">🏆 App dos Amigos FC</h1>
          <p className="text-zinc-400">Cadastro, sorteio, gols, assistências, ranking e caixa.</p>
          <p className={dbMsg === "Banco conectado" ? "text-xs text-emerald-400" : "text-xs text-yellow-400"}>{loading ? "Carregando banco..." : dbMsg}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setScreen("cash")} className="bg-emerald-500 text-black">Encerrar jogo</Button>
          <Button onClick={() => setHide(!hide)}>{hide ? "Mostrar níveis" : "Hide níveis"}</Button>
          {installPrompt && <Button onClick={installApp}>Instalar app</Button>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Box title="👥 Atletas" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Field label="Nome"><input className={inputCls} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Nível"><select className={inputCls} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
            <Field label="Posição"><select className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}><option>Linha</option><option>Goleiro</option></select></Field>
            <Field label="Status"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statusList.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</select></Field>
            <div className="flex items-end"><Button onClick={savePlayer} className="w-full bg-emerald-500 text-black">{editId ? "Salvar" : "Cadastrar"}</Button></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div className="bg-blue-950/40 rounded-xl p-3"><b>{players.filter((p) => p.status === "jogo").length}</b><br />Jogo</div>
            <div className="bg-emerald-950/40 rounded-xl p-3"><b>{players.filter((p) => p.status === "jogo_resenha").length}</b><br />Jogo + Resenha</div>
            <div className="bg-yellow-950/40 rounded-xl p-3"><b>{after.length}</b><br />Resenha</div>
            <div className="bg-red-950/40 rounded-xl p-3"><b>{players.filter((p) => p.status === "nao_vou").length}</b><br />Não vou</div>
            <div className="bg-zinc-800 rounded-xl p-3"><b>{pending.length}</b><br />Pendente</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className={`border ${rowClass(p.status)}`}>
                    <td className="p-3 font-bold rounded-l-xl">{p.name}</td>
                    <td>{hide ? "•••" : p.level}</td>
                    <td>{p.position}</td>
                    <td>
                      <select className="bg-zinc-950 text-white border border-zinc-700 rounded-lg p-1" value={p.status} onChange={(e) => updatePlayerStatus(p.id, e.target.value)}>
                        {statusList.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}
                      </select>
                    </td>
                    <td className="rounded-r-xl text-right p-3">
                      <button className="text-blue-300 font-bold mr-3" onClick={() => { setEditId(p.id); setForm(p); }}>Editar</button>
                      <button className="text-red-400 font-bold" onClick={() => removePlayer(p.id)}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Box>

        <Box title="🔀 Sorteio">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-800 p-3 rounded-xl"><b>{confirmed.length}</b><br />Confirmados</div>
            <div className="bg-zinc-800 p-3 rounded-xl"><b>{pending.length}</b><br />Faltam</div>
            <div className="bg-zinc-800 p-3 rounded-xl"><b>{after.length}</b><br />Resenha</div>
            <div className="bg-zinc-800 p-3 rounded-xl"><b>{money(expected)}</b><br />Arrecadação</div>
          </div>
          <Field label="Quantidade de times"><select className={inputCls} value={teamCount} onChange={(e) => { const value = Number(e.target.value); setTeamCount(value); setTeams(null); saveSettings({ teamCount: value }); }}><option value={2}>2 times</option><option value={3}>3 times</option></select></Field>
          {Array.from({ length: Number(teamCount) }).map((_, i) => (
            <Field key={i} label={`Nome do time ${i + 1}`}>
              <input className={inputCls} value={teamNames[i] || ""} onChange={(e) => { const names = teamNames.map((n, x) => x === i ? e.target.value : n); setTeamNames(names); saveSettings({ teamNames: names }); }} />
            </Field>
          ))}
          <Field label="Atletas por time"><input className={inputCls} type="number" value={teamSize} onChange={(e) => { const value = Number(e.target.value || 1); setTeamSize(value); saveSettings({ teamSize: value }); }} /></Field>
          <Button onClick={drawTeams} className="bg-emerald-500 text-black w-full">Sortear times</Button>
          {teamCount === 3 && <p className="text-xs text-zinc-500">Com 3 times, goleiros não entram no sorteio.</p>}
          {teams?.error && <p className="text-red-400">{teams.error}</p>}
          {Array.isArray(teams) && (
            <div className={teamCount === 3 ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
              {teams.map((team, i) => (
                <div key={i} className="bg-zinc-800 p-3 rounded-xl min-h-28">
                  <b>{teamNames[i]} ({team.score})</b>
                  {team.players.map((p) => <p key={p.id} className="uppercase text-xs mt-1">{p.name}</p>)}
                </div>
              ))}
            </div>
          )}
          {teamCount === 3 && Array.isArray(teams) && (
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
              <Button onClick={() => setInitial(shuffle([0, 1, 2]).slice(0, 2))} className="bg-blue-500 text-black w-full">Sortear jogo inicial</Button>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {[0, 1].map((i) => {
                  const idx = initial[i];
                  const tag = teamTag(teamNames[idx]);
                  return <div key={i} className={`h-24 rounded-xl flex flex-col items-center justify-center font-black ${idx !== undefined ? tag.color : "bg-zinc-800"}`}><span className="text-3xl">{idx !== undefined ? tag.short : "?"}</span>{idx !== undefined && <small>{teamNames[idx]}</small>}</div>;
                })}
                <b className="text-3xl">X</b>
              </div>
            </div>
          )}
        </Box>
      </div>

      <Box title="💾 Registrar jogos">
        <div className="flex justify-between gap-3">
          <p className="text-zinc-400">Lance gol e assistência abaixo do respectivo time.</p>
          <Button onClick={() => setGames([...games, newGame(Date.now())])} className="bg-emerald-500 text-black">+ Gerar jogo</Button>
        </div>
        {games.map((game) => (
          <div key={game.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-4xl font-black">Jogo {game.id}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <Field label="Time 1"><select className={inputCls} value={game.a} onChange={(e) => updateGame(game.id, { a: Number(e.target.value) })}>{Array.from({ length: Number(teamCount) }).map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field>
              <Field label="Gols"><input className={`${inputCls} text-4xl text-center font-black`} type="number" value={game.sa} onChange={(e) => updateGame(game.id, { sa: Number(e.target.value || 0) })} /></Field>
              <b className="text-center text-4xl">X</b>
              <Field label="Gols"><input className={`${inputCls} text-4xl text-center font-black`} type="number" value={game.sb} onChange={(e) => updateGame(game.id, { sb: Number(e.target.value || 0) })} /></Field>
              <Field label="Time 2"><select className={inputCls} value={game.b} onChange={(e) => updateGame(game.id, { b: Number(e.target.value) })}>{Array.from({ length: Number(teamCount) }).map((_, i) => <option key={i} value={i}>{teamNames[i]}</option>)}</select></Field>
            </div>
            <div className="text-center bg-white text-black rounded-xl p-4 text-3xl font-black uppercase">{teamNames[game.a]} {game.sa} x {game.sb} {teamNames[game.b]}</div>
            <div className="grid md:grid-cols-2 gap-4">{renderSide(game, 0)}{renderSide(game, 1)}</div>
          </div>
        ))}
        {err && <p className="text-red-400 font-bold">{err}</p>}
        <Button onClick={saveGames} className="bg-blue-500 text-black w-full">Salvar jogos</Button>
      </Box>

      <div className="grid md:grid-cols-2 gap-6">
        <Box title="📊 Ranking mensal">
          <div className="flex flex-col md:flex-row gap-2 md:items-end md:justify-between">
            <Field label="Mês"><input className={inputCls} type="month" value={rankMonth} onChange={(e) => setRankMonth(e.target.value)} /></Field>
            <Button onClick={exportCSV}>Exportar CSV</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-zinc-400"><tr><th className="text-left">Atleta</th><th>G</th><th>A</th><th>P</th><th>F</th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.name} className="border-b border-zinc-800">
                  <td className="py-2 font-bold">{s.name}</td>
                  <td className="text-center">{s.goals}</td>
                  <td className="text-center">{s.assists}</td>
                  <td className="text-center">{s.presences}</td>
                  <td className="text-center">{s.absences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <Box title="📅 Histórico">
          {history.length ? history.map((h) => (
            <div key={h.id} className="bg-zinc-800 rounded-xl p-3">
              <b>{h.names[0]} {h.sa} x {h.sb} {h.names[1]}</b>
              <p className="text-xs text-zinc-400">Gols: {h.goals.map((x) => x.p).join(", ") || "-"}</p>
            </div>
          )) : <p>Nenhum jogo salvo.</p>}
        </Box>
      </div>
    </main>
  );
}
