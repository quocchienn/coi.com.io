
let users = JSON.parse(localStorage.getItem("users") || "{}");
let currentUser = null;
let minePositions = [], revealed = 0, playing = false, totalReward = 0, bet = 0;
let multiplier = 1.2;
let balance = 0;

const clickSound = document.getElementById("clickSound");
const bombSound = document.getElementById("bombSound");
const cashSound = document.getElementById("cashSound");
const popup = document.getElementById("popup");

function updateBalanceDisplay() {
  document.getElementById("balance").innerText = balance.toLocaleString();
}

function updateBombChance() {
  if (!playing) {
    document.getElementById("chanceInfo").innerText = "Tỉ lệ gặp bom: -";
    return;
  }

  const totalCells = 25;
  const remainingMines = minePositions.length;
  const unrevealed = totalCells - revealed;

  if (unrevealed <= 0) return;

  const chance = remainingMines / unrevealed;
  document.getElementById("chanceInfo").innerText = `Tỉ lệ gặp bom: ${(chance * 100).toFixed(1)}%`;
}

function showPopup(message, type = "info") {
  popup.textContent = message;
  popup.className = "popup show";
  popup.style.background = type === "error" ? "#ff453a" : type === "success" ? "#30d158" : "#1e1e1e";
  setTimeout(() => popup.classList.remove("show"), 3000);
}

function startGame() {
  updatePlayersOnline("join");
  if (!currentUser) return showPopup("Vui lòng đăng nhập trước!", "error");

  const grid = document.getElementById("grid");
  const minesCount = parseInt(document.getElementById("minesCount").value);
  bet = parseInt(document.getElementById("betAmount").value);
  if (bet < 1500 || bet > balance) return showPopup("Cược không hợp lệ!", "error");

  grid.innerHTML = "";
  minePositions = [];
  revealed = 0;
  totalReward = bet;
  multiplier = 1 + (minesCount / 25); // càng nhiều bom, multiplier càng cao
  playing = true;
  balance -= bet;
  users[currentUser].balance = balance;
  saveUsers();
  addToHistory("Đặt cược", bet);
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();

  while (minePositions.length < minesCount) {
    const r = Math.floor(Math.random() * 25);
    if (!minePositions.includes(r)) minePositions.push(r);
  }

  for (let i = 0; i < 25; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.onclick = revealCell;
    grid.appendChild(cell);
  }

  document.getElementById("status").innerText = "Đang chơi...";
  updateBombChance();
}

function revealCell(e) {
  if (!playing) return;
  const index = parseInt(e.target.dataset.index);

  let safeBoost = revealed < 2;
  let isMine = minePositions.includes(index) && !(safeBoost && Math.random() < 0.6);

  if (isMine) {
    e.target.classList.add("bomb");
    e.target.innerText = "X";
    bombSound.play();
    playing = false;
    document.getElementById("status").innerText = `Thua! Mất ${bet.toLocaleString()} VND`;
    addToHistory("Thua cược", bet);
    showPopup(`Bạn đã thua và mất ${bet.toLocaleString()} VND`, "error");
    updateBombChance();

    document.querySelectorAll(".cell").forEach(cell => {
      if (minePositions.includes(parseInt(cell.dataset.index))) {
        cell.classList.add("bomb");
        cell.innerText = "X";
      }
    });
  } else if (!e.target.classList.contains("revealed")) {
    e.target.classList.add("revealed");
    e.target.innerText = "+";
    clickSound.play();
    revealed++;
    totalReward = Math.floor(totalReward * multiplier);
    multiplier += (minePositions.length / 40); // tăng theo số lượng bom
    document.getElementById("status").innerText = `Đang chơi... Thưởng: ${totalReward.toLocaleString()} VND`;
    updateBombChance();
  }
}

function cashOut() {
  updatePlayersOnline("leave");
  if (!playing) return;
  playing = false;
  cashSound.play();
  balance += totalReward;
  addToHistory("Rút thưởng", totalReward);
  if (currentUser) {
    users[currentUser].balance = balance;
    saveUsers(); updateLeaderboard();
  }
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
  document.getElementById("status").innerText = `Đã rút: ${totalReward.toLocaleString()} VND`;
  showPopup(`Bạn đã rút ${totalReward.toLocaleString()} VND`, "success");
  updateBombChance();
}

function showQRCode() {
  if (!currentUser) return showPopup("Vui lòng đăng nhập để nạp!", "error");
  document.getElementById("qrContainer").style.display = "block";
}

function showWithdrawForm() {
  document.getElementById("withdrawForm").style.display = "block";
}

function submitWithdraw() {
  const bank = document.getElementById("bankName").value.trim();
  const account = document.getElementById("bankAccount").value.trim();
  const amount = parseInt(document.getElementById("withdrawAmount").value);
  if (!bank || !account || isNaN(amount) || amount < 50000) return showPopup("Thông tin không hợp lệ hoặc số tiền tối thiểu là 50,000 VND", "error");
  if (!currentUser) return showPopup("Vui lòng đăng nhập để rút!", "error");
  if (amount > balance) return showPopup("Số dư không đủ!", "error");

  balance -= amount;
  users[currentUser].balance = balance;
  saveUsers(); updateLeaderboard();
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
  showPopup("Yêu cầu rút đã ghi nhận!", "success");
}

function mockTopup() {
  if (!currentUser) return showPopup("Đăng nhập để nạp!", "error");
  balance += 100000;
  users[currentUser].balance = balance;
  saveUsers(); updateLeaderboard();
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
  showPopup("Nạp thành công 100,000 VND!", "success");
}

function saveUsers() {
  localStorage.setItem("users", JSON.stringify(users));
}

function register() {
  const name = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  if (!name || !pass) return showPopup("Điền đầy đủ thông tin!", "error");
  if (users[name]) return showPopup("Tên đăng nhập đã tồn tại!", "error");

  users[name] = { password: pass, balance: 100000 };
  saveUsers(); updateLeaderboard();
  showPopup("Đăng ký thành công!", "success");
}

function login() {
  const name = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  if (!name || !pass) return showPopup("Điền đầy đủ thông tin!", "error");
  if (!users[name] || users[name].password !== pass) return showPopup("Sai thông tin đăng nhập!", "error");

  currentUser = name;
  balance = users[name].balance;
  updateAuthUI(); updateLeaderboard();
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
  showPopup("Đăng nhập thành công!", "success");
}

function logout() {
  updatePlayersOnline("leave");
  if (currentUser) {
    users[currentUser].balance = balance;
    saveUsers(); updateLeaderboard();
  }
  currentUser = null;
  balance = 0;
  updateAuthUI(); updateLeaderboard();
  updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
  showPopup("Đã đăng xuất", "info");
}

function updateAuthUI() {
  document.getElementById("authSection").style.display = currentUser ? "none" : "block";
  document.getElementById("userPanel").style.display = currentUser ? "block" : "none";
  if (currentUser) document.getElementById("currentUser").innerText = currentUser;
}


function updateLeaderboard() {
  const list = document.getElementById("leaderboardList");
  list.innerHTML = "";

  const sortedUsers = Object.entries(users)
    .sort(([, a], [, b]) => b.balance - a.balance)
    .slice(0, 10);

  for (const [name, data] of sortedUsers) {
    const li = document.createElement("li");
    li.textContent = `${name}: ${data.balance.toLocaleString()} VND`;
    list.appendChild(li);
  }
}

function updatePlayersOnline(status) {
  let playingUsers = JSON.parse(localStorage.getItem("playingUsers") || "[]");

  if (status === "join" && currentUser && !playingUsers.includes(currentUser)) {
    playingUsers.push(currentUser);
  } else if (status === "leave" && currentUser) {
    playingUsers = playingUsers.filter(name => name !== currentUser);
  }

  localStorage.setItem("playingUsers", JSON.stringify(playingUsers));
  renderPlayersOnline();
}

function renderPlayersOnline() {
  const list = document.getElementById("playersOnline");
  const playingUsers = JSON.parse(localStorage.getItem("playingUsers") || "[]");

  list.innerHTML = "";
  playingUsers.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    list.appendChild(li);
  });
}


function addToHistory(action, amount) {
  if (!currentUser) return;
  const history = JSON.parse(localStorage.getItem("betHistory") || "{}");
  if (!history[currentUser]) history[currentUser] = [];

  const entry = { action, amount, time: new Date().toLocaleTimeString() };
  history[currentUser].unshift(entry); // add to beginning
  history[currentUser] = history[currentUser].slice(0, 10); // keep max 10
  localStorage.setItem("betHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("betHistory");
  if (!list || !currentUser) return;
  const history = JSON.parse(localStorage.getItem("betHistory") || "{}")[currentUser] || [];
  list.innerHTML = "";
  history.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `[${entry.time}] ${entry.action}: ${entry.amount.toLocaleString()} VND`;
    list.appendChild(li);
  });
}

// Khởi tạo
updateAuthUI(); updateLeaderboard();
updateBalanceDisplay(); updateLeaderboard(); renderPlayersOnline(); renderHistory();
