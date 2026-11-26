).reset();
  editingMatch = null;
}
$("addMatchBtn").addEventListener("click", () => openMatch());
$("cancelMatch").addEventListener("click", closeMatch);

$("matchForm").addEventListener("submit", e => {
  e.preventDefault();
  const team1 = Number($("team1").value);
  const team2 = Number($("team2").value);
  if (team1 === team2) {
    alert("Please select two different teams.");
    return;
  }
  const match = {
    id: editingMatch ?? Date.now(),
    team1, team2,
    date: $("matchDate").value,
    venue: $("matchVenue").value.trim(),
    score1: null, score2: null
  };
  if (editingMatch !== null) {
    const old = data.matches.find(m => m.id === editingMatch);
    if (old) {
      match.score1 = old.score1;
      match.score2 = old.score2;
      Object.assign(old, match);
    }
  } else {
    data.matches.push(match);
  }
  closeMatch();
  save();
});
function editMatch(id) { openMatch(id); }
function deleteMatch(id) {
  if (confirm("Delete this match?")) {
    data.matches = data.matches.filter(m => m.id !== id);
    save();
  }
}

// Scores
function openScore(id) {
  scoringMatch = id;
  const m = data.matches.find(x => x.id === id);
  if (!m) return;
  $("scoreMatchTitle").textContent = ${teamName(m.team1)} vs ${teamName(m.team2)};
  $("score1").value = m.score1 ?? "";
  $("score2").value = m.score2 ?? "";
  $("scoreModal").classList.remove("hidden");
}
function closeScore() {
  $("scoreModal").classList.add("hidden");
  scoringMatch = null;
}
$("cancelScore").addEventListener("click", closeScore);
$("scoreForm").addEventListener("submit", e => {
  e.preventDefault();
  const a = Number($("score1").value);
  const b = Number($("score2").value);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    alert("Enter valid non-negative whole-number scores.");
    return;
  }
  const m = data.matches.find(x => x.id === scoringMatch);
  if (!m) return;
  m.score1 = a;
  m.score2 = b;
  closeScore();
  save();
});

function teamName(id) {
  return data.teams.find(t => t.id == id)?.name || "Deleted Team";
}
function matchStatus(m) {
  return m.score1 !== null && m.score2 !== null ? "Completed" : "Scheduled";
}
function matchScore(m) {
  return m.score1 === null || m.score2 === null ? "VS" : ${m.score1} - ${m.score2};
}

// Standings
function getStandings() {
  const rows = data.teams.map(t => ({
    id:t.id, name:t.name, played:0, won:0, lost:0, draw:0, points:0
  }));
  data.matches.forEach(m => {
    if (m.score1 === null || m.score2 === null) return;
    const a = rows.find(t => t.id == m.team1);
    const b = rows.find(t => t.id == m.team2);
    if (!a || !b) return;
    a.played++;
    b.played++;
    if (m.score1 > m.score2) {
      a.won++; b.lost++; a.points += 2;
    } else if (m.score1 < m.score2) {
      b.won++; a.lost++; b.points += 2;
    } else {
      a.draw++; b.draw++; a.points++; b.points++;
    }
  });
  return rows.sort((a,b) =>
    b.points - a.points || b.won - a.won || a.name.localeCompare(b.name)
  );
}

// Render
function render() {
  $("totalTeams").textContent = data.teams.length;
  $("totalMatches").textContent = data.matches.length;
  const completed = data.matches.filter(m => matchStatus(m) === "Completed");
  $("completedMatches").textContent = completed.length;
  $("upcomingMatches").textContent = data.matches.length - completed.length;

  $("teamsTable").innerHTML = data.teams.map(t => `
    <tr>
      <td><strong>${escapeHTML(t.name)}</strong></td>
      <td>${escapeHTML(t.coach || "—")}</td>
      <td>
        <button class="action-btn" onclick="editTeam(${t.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteTeam(${t.id})">Delete</button>
      </td>
    </tr>`).join("") || <tr><td colspan="3">No teams added yet.</td></tr>;

  $("matchesTable").innerHTML = data.matches.map(m => `
    <tr>
      <td><strong>${escapeHTML(teamName(m.team1))}</strong> vs <strong>${escapeHTML(teamName(m.team2))}</strong></td>
      <td>${escapeHTML(m.date || "Not set")}</td>
      <td>${escapeHTML(m.venue || "—")}</td>
      <td><strong>${matchScore(m)}</strong></td>
      <td><span class="status ${matchStatus(m)}">${matchStatus(m)}</span></td>
      <td>
        <button class="action-btn" onclick="openScore(${m.id})">Score</button>
        <button class="action-btn" onclick="editMatch(${m.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteMatch(${m.id})">Delete</button>
      </td>
    </tr>`).join("") || <tr><td colspan="6">No matches scheduled yet.</td></tr>;

  $("recentMatches").innerHTML = data.matches.slice(-5).reverse().map(m => `
    <tr>
      <td>${escapeHTML(teamName(m.team1))} vs ${escapeHTML(teamName(m.team2))}</td>
      <td>${escapeHTML(m.date || "Not set")}</td>
      <td>${matchScore(m)}</td>
      <td><span class="status ${matchStatus(m)}">${matchStatus(m)}</span></td>
    </tr>`).join("") || <tr><td colspan="4">No matches yet.</td></tr>;

  $("standingsTable").innerHTML = getStandings().map((t,i) => `
    <tr>
      <td><strong>${i+1}</strong></td><td><strong>${escapeHTML(t.name)}</strong></td>
      <td>${t.played}</td><td>${t.won}</td><td>${t.lost}</td>
      <td>${t.draw}</td><td><strong>${t.points}</strong></td>
    </tr>`).join("") || <tr><td colspan="7">No teams available.</td></tr>;

  $("tournamentName").value = data.tournament || "";
  $("tournamentVenue").value = data.venue || "";
}

// Settings
$("saveSettings").addEventListener("click", () => {
  data.tournament = $("tournamentName").value.trim();
  data.venue = $("tournamentVenue").value.trim();
  save();
  alert("Tournament settings saved!");
});

// Export backup
$("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hoopdesk-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Import backup
$("importData").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!imported || !Array.isArray(imported.teams) || !Array.isArray(imported.matches)) {
      throw new Error("Invalid backup");
    }
    data = imported;
    save();
    alert("Backup restored successfully!");
  } catch (error) {
    alert("Invalid backup file.");
  }
  e.target.value = "";
});

// Reset
$("resetData").addEventListener("click", () => {
  if (confirm("Are you sure? This will delete all tournament data in this browser.")) {
    data = clone(defaultData);
    save();
    alert("Tournament data has been reset.");
  }
});

render();
9:02 AM
Gab
const $ = id => document.getElementById(id);
const KEY = "hoopdesk_data";
const clone = value => JSON.parse(JSON.stringify(value));

const defaultData = {
  tournament: "Basketball Tournament",
  venue: "Open Court",
  teams: [
    {id:1,name:"Team White",coach:"Coach White"},
    {id:2,name:"Team ICU",coach:"Coach ICU"},
    {id:3,name:"BM Prints",coach:"Coach BM"},
    {id:4,name:"Team Purple",coach:"Coach Purple"}
  ],
  matches: []
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.teams) && Array.isArray(saved.matches)) return saved;
  } catch (error) {
    console.warn("Could not load saved HoopDesk data:", error);
  }
  return clone(defaultData);
}

let data = loadData();
let editingTeam = null;
let editingMatch = null;
let scoringMatch = null;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    render();
  } catch (error) {
    alert("Could not save data in this browser. Check available storage.");
    console.error(error);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

// Demo-only login. This is not secure authentication.
$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("username").value === "admin" && $("password").value === "admin123") {
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("loginError").textContent = "";
    sessionStorage.setItem("hoopdesk_login", "true");
    render();
  } else {
    $("loginError").textContent = "Incorrect username or password.";
  }
});

function logout() {
  sessionStorage.removeItem("hoopdesk_login");
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("password").value = "";
}
$("logoutBtn").addEventListener("click", logout);

if (sessionStorage.getItem("hoopdesk_login") === "true") {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
}

// Navigation
document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    $(button.dataset.page).classList.remove("hidden");
    $("pageTitle").textContent = button.textContent.trim();
    render();
  });
});

// Teams
function openTeam(id = null) {
  editingTeam = id;
  const team = data.teams.find(t => t.id === id);
  $("teamModalTitle").textContent = team ? "Edit Team" : "Add Team";
  $("teamName").value = team?.name || "";
  $("teamCoach").value = team?.coach || "";
  $("teamModal").classList.remove("hidden");
}
function closeTeam() {
  $("teamModal").classList.add("hidden");
  $("teamForm").reset();
  editingTeam = null;
}
$("addTeamBtn").addEventListener("click", () => openTeam());
$("cancelTeam").addEventListener("click", closeTeam);

$("teamForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("teamName").value.trim();
  const coach = $("teamCoach").value.trim();
  if (!name) return;

  if (data.teams.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== editingTeam)) {
    alert("Team name already exists.");
    return;
  }

  if (editingTeam !== null) {
    const team = data.teams.find(t => t.id === editingTeam);
    if (team) { team.name = name; team.coach = coach; }
  } else {
    data.teams.push({id:Date.now(), name, coach});
  }
  closeTeam();
  save();
});

function editTeam(id) { openTeam(id); }
function deleteTeam(id) {
  const team = data.teams.find(t => t.id === id);
  if (!team) return;
  if (data.matches.some(m => m.team1 == id || m.team2 == id)) {
    alert("This team is already used in a match. Delete its matches first.");
    return;
  }
  if (confirm("Delete " + team.name + "?")) {
    data.teams = data.teams.filter(t => t.id !== id);
    save();
  }
}

// Matches
function openMatch(id = null) {
  editingMatch = id;
  const match = data.matches.find(m => m.id === id);
  if (data.teams.length < 2 && !match) {
    alert("Add at least two teams first.");
    return;
  }
  $("matchModalTitle").textContent = match ? "Edit Match" : "Schedule Match";
  $("team1").innerHTML = data.teams.map(t => <option value="${t.id}">${escapeHTML(t.name)}</option>).join("");
  $("team2").innerHTML = data.teams.map(t => <option value="${t.id}">${escapeHTML(t.name)}</option>).join("");
  $("matchDate").value = match?.date || "";
  $("matchVenue").value = match?.venue || data.venue || "";
  if (match) {
    $("team1").value = match.team1;
    $("team2").value = match.team2;
  } else {
    $("team1").selectedIndex = 0;
    $("team2").selectedIndex = 1;
  }
  $("matchModal").classList.remove("hidden");
}
function closeMatch() {
  $("matchModal").classList.add("hidden");
  $("matchForm").reset();
  editingMatch = null;
}
$("addMatchBtn").addEventListener("click", () => openMatch());
$("cancelMatch").addEventListener("click", closeMatch);

$("matchForm").addEventListener("submit", e => {
  e.preventDefault();
  const team1 = Number($("team1").value);
  const team2 = Number($("team2").value);
  if (team1 === team2) {
    alert("Please select two different teams.");
    return;
  }
  const match = {
    id: editingMatch ?? Date.now(),
    team1, team2,
    date: $("matchDate").value,
    venue: $("matchVenue").value.trim(),
    score1: null, score2: null
  };
  if (editingMatch !== null) {
    const old = data.matches.find(m => m.id === editingMatch);
    if (old) {
      match.score1 = old.score1;
      match.score2 = old.score2;
      Object.assign(old, match);
    }
  } else {
    data.matches.push(match);
  }
  closeMatch();
  save();
});
function editMatch(id) { openMatch(id); }
function deleteMatch(id) {
  if (confirm("Delete this match?")) {
    data.matches = data.matches.filter(m => m.id !== id);
    save();
  }
}

// Scores
function openScore(id) {
  scoringMatch = id;
  const m = data.matches.find(x => x.id === id);
  if (!m) return;
  $("scoreMatchTitle").textContent = ${teamName(m.team1)} vs ${teamName(m.team2)};
  $("score1").value = m.score1 ?? "";
  $("score2").value = m.score2 ?? "";
  $("scoreModal").classList.remove("hidden");
}
function closeScore() {
  $("scoreModal").classList.add("hidden");
  scoringMatch = null;
}
$("cancelScore").addEventListener("click", closeScore);
$("scoreForm").addEventListener("submit", e => {
  e.preventDefault();
  const a = Number($("score1").value);
  const b = Number($("score2").value);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    alert("Enter valid non-negative whole-number scores.");
    return;
  }
  const m = data.matches.find(x => x.id === scoringMatch);
  if (!m) return;
  m.score1 = a;
  m.score2 = b;
  closeScore();
  save();
});

function teamName(id) {
  return data.teams.find(t => t.id == id)?.name || "Deleted Team";
}
function matchStatus(m) {
  return m.score1 !== null && m.score2 !== null ? "Completed" : "Scheduled";
}
function matchScore(m) {
  return m.score1 === null || m.score2 === null ? "VS" : ${m.score1} - ${m.score2};
}

// Standings
function getStandings() {
  const rows = data.teams.map(t => ({
    id:t.id, name:t.name, played:0, won:0, lost:0, draw:0, points:0
  }));
  data.matches.forEach(m => {
    if (m.score1 === null || m.score2 === null) return;
    const a = rows.find(t => t.id == m.team1);
    const b = rows.find(t => t.id == m.team2);
    if (!a || !b) return;
    a.played++;
    b.played++;
    if (m.score1 > m.score2) {
      a.won++; b.lost++; a.points += 2;
    } else if (m.score1 < m.score2) {
      b.won++; a.lost++; b.points += 2;
    } else {
      a.draw++; b.draw++; a.points++; b.points++;
    }
  });
  return rows.sort((a,b) =>
    b.points - a.points || b.won - a.won || a.name.localeCompare(b.name)
  );
}

// Render
function render() {
  $("totalTeams").textContent = data.teams.length;
  $("totalMatches").textContent = data.matches.length;
  const completed = data.matches.filter(m => matchStatus(m) === "Completed");
  $("completedMatches").textContent = completed.length;
  $("upcomingMatches").textContent = data.matches.length - completed.length;

  $("teamsTable").innerHTML = data.teams.map(t => `
    <tr>
      <td><strong>${escapeHTML(t.name)}</strong></td>
      <td>${escapeHTML(t.coach || "—")}</td>
      <td>
        <button class="action-btn" onclick="editTeam(${t.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteTeam(${t.id})">Delete</button>
      </td>
    </tr>`).join("") || <tr><td colspan="3">No teams added yet.</td></tr>;

  $("matchesTable").innerHTML = data.matches.map(m => `
    <tr>
      <td><strong>${escapeHTML(teamName(m.team1))}</strong> vs <strong>${escapeHTML(teamName(m.team2))}</strong></td>
      <td>${escapeHTML(m.date || "Not set")}</td>
      <td>${escapeHTML(m.venue || "—")}</td>
      <td><strong>${matchScore(m)}</strong></td>
      <td><span class="status ${matchStatus(m)}">${matchStatus(m)}</span></td>
      <td>
        <button class="action-btn" onclick="openScore(${m.id})">Score</button>
        <button class="action-btn" onclick="editMatch(${m.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteMatch(${m.id})">Delete</button>
      </td>
    </tr>`).join("") || <tr><td colspan="6">No matches scheduled yet.</td></tr>;

  $("recentMatches").innerHTML = data.matches.slice(-5).reverse().map(m => `
    <tr>
      <td>${escapeHTML(teamName(m.team1))} vs ${escapeHTML(teamName(m.team2))}</td>
      <td>${escapeHTML(m.date || "Not set")}</td>
      <td>${matchScore(m)}</td>
      <td><span class="status ${matchStatus(m)}">${matchStatus(m)}</span></td>
    </tr>`).join("") || <tr><td colspan="4">No matches yet.</td></tr>;

  $("standingsTable").innerHTML = getStandings().map((t,i) => `
    <tr>
      <td><strong>${i+1}</strong></td><td><strong>${escapeHTML(t.name)}</strong></td>
      <td>${t.played}</td><td>${t.won}</td><td>${t.lost}</td>
      <td>${t.draw}</td><td><strong>${t.points}</strong></td>
    </tr>`).join("") || <tr><td colspan="7">No teams available.</td></tr>;

  $("tournamentName").value = data.tournament || "";
  $("tournamentVenue").value = data.venue || "";
}

// Settings
$("saveSettings").addEventListener("click", () => {
  data.tournament = $("tournamentName").value.trim();
  data.venue = $("tournamentVenue").value.trim();
  save();
  alert("Tournament settings saved!");
});

// Export backup
$("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hoopdesk-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Import backup
$("importData").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!imported || !Array.isArray(imported.teams) || !Array.isArray(imported.matches)) {
      throw new Error("Invalid backup");
    }
    data = imported;
    save();
    alert("Backup restored successfully!");
  } catch (error) {
    alert("Invalid backup file.");
  }
  e.target.value = "";
});

// Reset
$("resetData").addEventListener("click", () => {
  if (confirm("Are you sure? This will delete all tournament data in this browser.")) {
    data = clone(defaultData);
    save();
    alert("Tournament data has been reset.");
  }
});

render();
