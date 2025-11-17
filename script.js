// script.js - SAEP demo (localStorage)
// Names of storage keys
const STORAGE_KEY = "saep_data_v1";
const AUTH_KEY = "saep_logged_user";

// ---------- Utility ----------
function qs(selector){ return document.querySelector(selector) }
function qsa(selector){ return Array.from(document.querySelectorAll(selector)) }
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9) }
function todayISO(){ return new Date().toISOString().slice(0,10) }

// ---------- Data model: seed or load ----------
const seedData = () => ({
  dbName: "saep_db",
  createdAt: new Date().toISOString(),
  users: [
    // must be at least 3 users (for SQL requirement too)
    { id: "u_admin", name: "Administrador", email: "admin@saep.com", password:"admin123", role:"admin" },
    { id: "u_jose", name: "José Almeida", email: "jose@almox.com", password:"jose123", role:"user" },
    { id: "u_maria", name: "Maria Silva", email: "maria@almox.com", password:"maria123", role:"user" }
  ],
  products: [
    // at least 3 products
    { id:"p_martelo_16", name:"Martelo de Unha 16 oz MASTER", brand:"MASTER", model:"16oz-R", qty:12, min:3, features:["cabo tubular","16 oz","perfil reto"] },
    { id:"p_chave_fenda_3", name:"Chave de Fenda 3mm Isolada", brand:"PROFIX", model:"CF-3I", qty:30, min:5, features:["isolada","ponta imantada","3mm"] },
    { id:"p_furadeira_500", name:"Furadeira 500W Industrial", brand:"FORCE", model:"F500", qty:5, min:2, features:["500W","220V","peso 3.2kg"] }
  ],
  movements: [
    // at least 3 movements
    { id:"m1", productId:"p_martelo_16", type:"entrada", qty:10, date:"2025-11-01", userId:"u_admin" },
    { id:"m2", productId:"p_chave_fenda_3", type:"entrada", qty:30, date:"2025-10-25", userId:"u_jose" },
    { id:"m3", productId:"p_furadeira_500", type:"entrada", qty:5, date:"2025-09-10", userId:"u_maria" }
  ]
});

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const d = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return d;
  }
  return JSON.parse(raw);
}
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

// Global state
let state = loadData();
let currentUser = null;

// ---------- Auth ----------
function tryAutoLogin(){
  const saved = localStorage.getItem(AUTH_KEY);
  if(saved){
    const uid = saved;
    const user = state.users.find(u => u.id === uid);
    if(user){ loginSuccess(user); return true; }
  }
  return false;
}
function login(email, password){
  const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if(!user) return { ok:false, msg:"E-mail ou senha incorretos." };
  loginSuccess(user);
  return { ok:true };
}
function loginSuccess(user){
  currentUser = user;
  localStorage.setItem(AUTH_KEY, user.id);
  qs("#login-section").classList.add("hidden");
  qs("#dashboard").classList.remove("hidden");
  qs("#username-display").textContent = user.name;
  showView("home");
  refreshAll();
}
function logout(){
  currentUser = null;
  localStorage.removeItem(AUTH_KEY);
  qs("#dashboard").classList.add("hidden");
  qs("#login-section").classList.remove("hidden");
}

// ---------- UI routing ----------
function showView(viewName){
  qsa(".tab").forEach(t => t.classList.toggle("active", t.dataset.view===viewName));
  qsa(".view").forEach(v => v.classList.toggle("active", v.id === `view-${viewName}`));
  // ensure hidden logic
  qsa(".view").forEach(v => v.classList.toggle("hidden", v.id !== `view-${viewName}`));
  // specific actions
  if(viewName==="products") renderProductsTable();
  if(viewName==="stock") { populateProductSelect(); renderStockTable(); renderMovements(); }
}

// ---------- Product CRUD ----------
function getProducts(){ return state.products.slice() }

function addOrUpdateProduct(data){
  if(!data.name) throw "Nome é obrigatório";
  if(data.qty < 0) throw "Quantidade inválida";
  if(data.min < 0) throw "Estoque mínimo inválido";

  if(data.id){
    // update
    const idx = state.products.findIndex(p => p.id === data.id);
    if(idx === -1) throw "Produto não encontrado";
    state.products[idx] = { ...state.products[idx], ...data, features: data.features || [] };
  } else {
    data.id = uid("p");
    state.products.push(data);
    // create initial movement record for initial qty if > 0
    if(data.qty && data.qty > 0){
      state.movements.push({
        id: uid("m"),
        productId: data.id,
        type: "entrada",
        qty: Number(data.qty),
        date: todayISO(),
        userId: currentUser ? currentUser.id : "system"
      });
    }
  }
  saveData(state);
}

function deleteProduct(id){
  state.products = state.products.filter(p => p.id !== id);
  // also remove movements
  state.movements = state.movements.filter(m => m.productId !== id);
  saveData(state);
}

// ---------- Movements ----------
function registerMovement({ productId, type, qty, date, userId }){
  if(!productId || !type || qty <= 0) throw "Dados da movimentação inválidos";
  const prod = state.products.find(p => p.id === productId);
  if(!prod) throw "Produto não encontrado";

  // For saída, validate sufficient qty
  if(type === "saida"){
    if(prod.qty - qty < 0) throw "Quantidade insuficiente em estoque";
    prod.qty -= Number(qty);
  } else {
    prod.qty += Number(qty);
  }

  state.movements.push({
    id: uid("m"),
    productId,
    type,
    qty: Number(qty),
    date,
    userId
  });

  saveData(state);
  return prod;
}

// ---------- UI Renderers ----------
function renderProductsTable(filter=""){
  const tbody = qs("#products-table tbody");
  tbody.innerHTML = "";
  const q = (filter || "").trim().toLowerCase();
  getProducts().forEach(p => {
    if(q){
      const hay = `${p.name} ${p.brand} ${p.model}`.toLowerCase();
      if(!hay.includes(q)) return;
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.brand||"-"}</td>
      <td>${p.qty}</td>
      <td>${p.min}</td>
      <td>
        <button class="btn" data-action="edit" data-id="${p.id}">Editar</button>
        <button class="btn danger" data-action="del" data-id="${p.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateProductSelect(){
  const sel = qs("#movement-product");
  sel.innerHTML = "";
  getProducts().forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.qty})`;
    sel.appendChild(opt);
  });
}

function renderStockTable(){
  const tbody = qs("#stock-table tbody");
  tbody.innerHTML = "";
  // copy array and sort alphabetically using insertion sort (requirement)
  const arr = getProducts().map(p => ({...p}));
  insertionSortByName(arr);
  arr.forEach(p => {
    const lastMv = lastMovementForProduct(p.id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.qty}</td>
      <td>${p.min}</td>
      <td>${ lastMv ? lastMv.date + " ("+ lastMv.type +")" : "-" }</td>
      <td>
        <button class="btn" data-action="view" data-id="${p.id}">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMovements(){
  const tbody = qs("#movement-history tbody");
  tbody.innerHTML = "";
  // show last 100 moves newest first
  const list = state.movements.slice().sort((a,b) => b.date.localeCompare(a.date));
  list.forEach(m => {
    const prod = state.products.find(p => p.id===m.productId);
    const user = state.users.find(u => u.id===m.userId) || { name: m.userId };
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod ? prod.name : m.productId}</td>
      <td>${m.type}</td>
      <td>${m.qty}</td>
      <td>${m.date}</td>
      <td>${user.name}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Helpers ----------
function lastMovementForProduct(pid){
  const moves = state.movements.filter(m => m.productId===pid);
  if(moves.length===0) return null;
  return moves.slice().sort((a,b) => b.date.localeCompare(a.date))[0];
}

// insertion sort by name (alphabetical)
function insertionSortByName(arr){
  for(let i=1;i<arr.length;i++){
    let key = arr[i];
    let j = i-1;
    while(j>=0 && arr[j].name.toLowerCase() > key.name.toLowerCase()){
      arr[j+1] = arr[j];
      j--;
    }
    arr[j+1] = key;
  }
  return arr;
}

// low stock alerts
function renderLowStockAlerts(){
  const container = qs("#low-stock-alerts");
  container.innerHTML = "";
  state.products.forEach(p => {
    if(p.qty < p.min){
      const div = document.createElement("div");
      div.className = "alert";
      div.innerHTML = `<strong>Atenção:</strong> ${p.name} está com estoque abaixo do mínimo (${p.qty} < ${p.min}).`;
      container.appendChild(div);
    }
  });
}

// re-render everything
function refreshAll(){
  renderLowStockAlerts();
  renderProductsTable(qs("#product-search").value);
  renderStockTable();
  renderMovements();
  populateProductSelect();
}

// ---------- Event bindings ----------
function bindEvents(){
  // login
  qs("#login-form").addEventListener("submit", e => {
    e.preventDefault();
    const email = qs("#email").value.trim();
    const pass = qs("#password").value;
    const res = login(email, pass);
    const msg = qs("#login-message");
    if(!res.ok){ msg.textContent = res.msg; return; }
    msg.textContent = "";
  });

  qs("#btn-logout").addEventListener("click", () => {
    logout();
  });

  qsa(".tab").forEach(t => t.addEventListener("click", () => showView(t.dataset.view)));

  // product form
  qs("#product-form").addEventListener("submit", e => {
    e.preventDefault();
    try {
      const id = qs("#product-id").value || null;
      const name = qs("#product-name").value.trim();
      const brand = qs("#product-brand").value.trim();
      const model = qs("#product-model").value.trim();
      const qty = Number(qs("#product-qty").value);
      const min = Number(qs("#product-min").value);
      const features = qs("#product-features").value.split(";").map(s=>s.trim()).filter(Boolean);

      if(!name) return alert("Nome é obrigatório.");
      addOrUpdateProduct({ id, name, brand, model, qty, min, features });
      alert("Produto salvo com sucesso.");
      qs("#product-form").reset();
      qs("#product-id").value = "";
      refreshAll();
    } catch(err){
      alert("Erro: " + err);
    }
  });

  qs("#product-reset").addEventListener("click", () => {
    qs("#product-form").reset();
    qs("#product-id").value = "";
  });

  // product table actions (edit/delete)
  qs("#products-table tbody").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if(!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if(action === "edit"){
      const p = state.products.find(x => x.id === id);
      if(!p) return alert("Produto não encontrado");
      qs("#product-id").value = p.id;
      qs("#product-name").value = p.name;
      qs("#product-brand").value = p.brand;
      qs("#product-model").value = p.model;
      qs("#product-qty").value = p.qty;
      qs("#product-min").value = p.min;
      qs("#product-features").value = (p.features || []).join(" ; ");
      showView("products");
    } else if(action === "del"){
      if(!confirm("Deseja realmente excluir este produto? Esta ação removerá também o histórico de movimentações.")) return;
      deleteProduct(id);
      refreshAll();
    }
  });

  // search
  qs("#product-search").addEventListener("input", (e) => {
    renderProductsTable(e.target.value);
  });

  // Movement form
  qs("#movement-form").addEventListener("submit", e => {
    e.preventDefault();
    try{
      const productId = qs("#movement-product").value;
      const type = qs("#movement-type").value;
      const qty = Number(qs("#movement-qty").value);
      const date = qs("#movement-date").value;
      const user = qs("#movement-user").value.trim() || (currentUser ? currentUser.name : "anônimo");
      if(!date) return alert("Informe a data da movimentação.");
      // find or create user reference (for audit)
      let userRec = state.users.find(u => u.name === user);
      if(!userRec){
        userRec = { id: uid("u"), name: user, email: `${user.replace(/\s+/g,'').toLowerCase()}@local`, password:"", role:"user" };
        state.users.push(userRec);
      }
      const prod = registerMovement({ productId, type, qty, date, userId: userRec.id });
      saveData(state);
      refreshAll();
      // check alert
      if(type === "saida" && prod.qty < prod.min){
        alert(`Atenção: o produto "${prod.name}" ficou abaixo do estoque mínimo (${prod.qty} < ${prod.min}).`);
      } else {
        alert("Movimentação registrada com sucesso.");
      }
    }catch(err){
      alert("Erro ao registrar movimentação: " + err);
    }
  });

  // refresh sorted button
  qs("#refresh-sorted").addEventListener("click", () => renderStockTable());

  // view stock actions (view product)
  qs("#stock-table tbody").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if(!btn) return;
    const id = btn.dataset.id;
    const p = state.products.find(x => x.id === id);
    if(!p) return;
    alert(`Produto: ${p.name}\nMarca: ${p.brand}\nModelo: ${p.model}\nQtd: ${p.qty}\nMin: ${p.min}\nCaracterísticas: ${(p.features||[]).join(", ")}`);
  });
}

// ---------- Init ----------
(function init(){
  bindEvents();
  // Set default date in movement form
  qs("#movement-date").value = todayISO();
  // try auto-login (if previously logged)
  if(!tryAutoLogin()){
    qs("#login-section").classList.remove("hidden");
    qs("#dashboard").classList.add("hidden");
  }
  refreshAll();
})();
