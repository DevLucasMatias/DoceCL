import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFGN-HlN620RFrFAw2ty-KU4gRWrWXtIE",
  authDomain: "brigadeirospainel.firebaseapp.com",
  projectId: "brigadeirospainel",
  storageBucket: "brigadeirospainel.appspot.com",
  messagingSenderId: "786298308276",
  appId: "1:786298308276:web:a548c7b7e604c4d88b79e1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PRODUCTS = [
  { id: "Brigadeiro", nome: "Brigadeiro Tradicional", preco: 3.0, imagem: "briga.jpg" },
  { id: "kit12", nome: "Kit com 12 unidades", preco: 38.00, imagem: "2.jpg" },
  { id: "kit12", nome: "Kit com 24 unidades", preco: 74.00, imagem: "2.jpg" },
  { id: "Pudim", nome: "Pudim Tradicional", preco: 6.0, imagem: "pudim.jpg.avif" },
  { id: "Bolo", nome: "Bolo Tradicional", preco: 8.0, imagem: "bolo.jpg" },
    
  ];

let currentSale = [];
let completedSales = [];
let currentExpenses = [];
let currentPage = 1;
let expensePage = 1;
const itemsPerPage = 10;
let expenseChart = null;

const DOM = {
  produtosDiv: document.getElementById("produtos"),
  formSale: document.getElementById("form-venda"),
  vendaAtualDiv: document.getElementById("venda-atual"),
  compradoresDiv: document.getElementById("compradores"),
  clientDebtsDiv: document.getElementById("client-debts"),
  despesasDiv: document.getElementById("despesas"),
  tabs: document.querySelectorAll(".tab"),
  tabContents: document.querySelectorAll(".tab-content"),
  filterClient: document.getElementById("filtro-cliente"),
  filterStart: document.getElementById("filtro-data-inicio"),
  filterEnd: document.getElementById("filtro-data-fim"),
  filterStatus: document.getElementById("filtro-status"),
  filterProduct: document.getElementById("filtro-produto"),
  exportData: document.getElementById("export-data"),
  formExpense: document.getElementById("form-despesa"),
  filterECategoria: document.getElementById("filtro-despesa-categoria"),
  filterEDescricao: document.getElementById("filtro-despesa-descricao"),
  filterEStart: document.getElementById("filtro-despesa-data-inicio"),
  filterEEnd: document.getElementById("filtro-despesa-data-fim"),
  exportExpensesBtn: document.getElementById("export-expenses"),
  modalVenda: document.getElementById("modal-confirmacao"),
  modalVendaDetalhes: document.getElementById("modal-venda-detalhes"),
  confirmarVenda: document.getElementById("confirmar-venda"),
  cancelarVenda: document.getElementById("cancelar-venda"),
  modalDespesa: document.getElementById("modal-confirmacao-despesa"),
  modalDespesaDetalhes: document.getElementById("modal-despesa-detalhes"),
  confirmarDespesa: document.getElementById("confirmar-despesa"),
  cancelarDespesa: document.getElementById("cancelar-despesa"),
  prevPage: document.getElementById("prev-page"),
  nextPage: document.getElementById("next-page"),
  pageInfo: document.getElementById("page-info"),
  prevExpensePage: document.getElementById("prev-expense-page"),
  nextExpensePage: document.getElementById("next-expense-page"),
  expensePageInfo: document.getElementById("expense-page-info"),
  filterClientDebts: document.getElementById("filtro-cliente-debts"),
  filterStatusDebts: document.getElementById("filtro-status-debts"),
  sumVendas: document.getElementById("sum-vendas"),
  sumRecebido: document.getElementById("sum-recebido"),
  sumAberto: document.getElementById("sum-aberto"),
  sumDespesas: document.getElementById("sum-despesas"),
  dataInput: document.getElementById("data"),
};

function debounce(func, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
}

// === CORREÇÃO DEFINITIVA DO PROBLEMA DE DATA (fuso horário) ===
function toLocalISODate(dateInput) {
  // Recebe "YYYY-MM-DD" e devolve no mesmo formato, mas evitando erro de fuso
  const date = new Date(dateInput + "T12:00:00"); // força meio-dia local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatarDataBrasileira(dateString) {
  // Converte "2026-01-02" → "02/01/2026"
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

// === FILTRO "NÃO PAGO" CORRIGIDO ===
function getFilteredSales() {
  let filtered = [...completedSales];
  if (DOM.filterClient.value) filtered = filtered.filter(s => s.nome.toLowerCase().includes(DOM.filterClient.value.toLowerCase()));
  if (DOM.filterProduct.value) filtered = filtered.filter(s => s.produto.toLowerCase().includes(DOM.filterProduct.value.toLowerCase()));
  
  if (DOM.filterStatus.value === "pago") filtered = filtered.filter(s => s.pago === true);
  if (DOM.filterStatus.value === "nao-pago") filtered = filtered.filter(s => s.pago === false);
  
  if (DOM.filterStart.value) filtered = filtered.filter(s => s.data >= DOM.filterStart.value);
  if (DOM.filterEnd.value) filtered = filtered.filter(s => s.data <= DOM.filterEnd.value);
  return filtered;
}

// === DATA DE HOJE AUTOMÁTICA ===
function setTodayDate() {
  if (!DOM.dataInput.value) {
    const today = new Date().toISOString().split('T')[0];
    DOM.dataInput.value = today;
  }
}

// === RENDERIZAÇÃO DOS PRODUTOS (adiciona 1 unidade direto) ===
function renderProducts() {
  DOM.produtosDiv.innerHTML = "";
  PRODUCTS.forEach(prod => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-lg hover:shadow-2xl transition overflow-hidden";
    card.innerHTML = `
      <img src="${prod.imagem}" alt="${prod.nome}" class="w-full h-56 object-cover" />
      <div class="p-6 text-center">
        <h4 class="font-bold text-xl mb-3">${prod.nome}</h4>
        <p class="text-3xl font-bold text-pink-600 mb-4">R$ ${prod.preco.toFixed(2)}</p>
        <button class="bg-pink-600 text-white w-full py-3 rounded-lg font-semibold hover:bg-pink-700">Adicionar</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => addProductDirectly(prod));
    DOM.produtosDiv.appendChild(card);
  });
}

function addProductDirectly(prod) {
  const item = currentSale.find(i => i.id === prod.id);
  if (item) {
    item.qtd += 1;
  } else {
    currentSale.push({ ...prod, qtd: 1 });
  }
  renderCurrentSale();
}

// === CARRINHO ===
function renderCurrentSale() {
  if (currentSale.length === 0) {
    DOM.vendaAtualDiv.innerHTML = `<p class="text-center text-gray-500 py-12 text-xl">Nenhum item adicionado ainda</p>`;
    return;
  }
  const total = currentSale.reduce((s, i) => s + i.qtd * i.preco, 0);
  DOM.vendaAtualDiv.innerHTML = `
    <h3 class="text-2xl font-bold mb-6 text-pink-700">Carrinho Atual</h3>
    ${currentSale.map((item, index) => `
      <div class="flex justify-between items-center bg-white p-5 rounded-lg shadow mb-4">
        <div>
          <p class="font-semibold text-lg">${item.nome}</p>
          <p class="text-gray-600">${item.qtd} × R$ ${item.preco.toFixed(2)} = R$ ${(item.qtd * item.preco).toFixed(2)}</p>
        </div>
        <div class="flex items-center gap-3">
          <button class="minus bg-red-500 text-white w-10 h-10 rounded-full text-xl" data-index="${index}">–</button>
          <span class="text-2xl font-bold w-12 text-center">${item.qtd}</span>
          <button class="plus bg-green-500 text-white w-10 h-10 rounded-full text-xl" data-index="${index}">+</button>
          <button class="remove bg-gray-700 text-white px-5 py-2 rounded" data-index="${index}">Remover</button>
        </div>
      </div>
    `).join("")}
    <div class="text-right mt-8 border-t-4 border-pink-600 pt-6">
      <p class="text-3xl font-bold text-pink-600">Total: R$ ${total.toFixed(2)}</p>
    </div>
  `;
  DOM.vendaAtualDiv.querySelectorAll(".plus").forEach(btn => btn.onclick = () => { currentSale[btn.dataset.index].qtd++; renderCurrentSale(); });
  DOM.vendaAtualDiv.querySelectorAll(".minus").forEach(btn => btn.onclick = () => { if (currentSale[btn.dataset.index].qtd > 1) currentSale[btn.dataset.index].qtd--; renderCurrentSale(); });
  DOM.vendaAtualDiv.querySelectorAll(".remove").forEach(btn => btn.onclick = () => { currentSale.splice(btn.dataset.index, 1); renderCurrentSale(); });
}

// === REGISTRO DE VENDA (com data corrigida e atualização do histórico) ===
DOM.formSale.addEventListener("submit", async e => {
  e.preventDefault();
  if (currentSale.length === 0) return alert("Adicione pelo menos um item!");
  const nome = DOM.formSale.querySelector("#nome").value.trim();
  const telefone = DOM.formSale.querySelector("#telefone").value.trim() || "N/A";
  const data = DOM.formSale.querySelector("#data").value;
  if (!nome || !data) return alert("Preencha os campos obrigatórios!");
  const formattedDate = toLocalISODate(data);
  const total = currentSale.reduce((s, i) => s + i.qtd * i.preco, 0);

  DOM.modalVendaDetalhes.innerHTML = `
    <p><strong>Cliente:</strong> ${nome}</p>
    <p><strong>Telefone:</strong> ${telefone}</p>
    <p><strong>Data:</strong> ${formatarDataBrasileira(data)}</p>
    <ul class="list-disc pl-6 mt-4">${currentSale.map(i => `<li>${i.nome} × ${i.qtd} = R$ ${(i.qtd * i.preco).toFixed(2)}</li>`).join("")}</ul>
    <p class="text-2xl font-bold mt-6">Total: R$ ${total.toFixed(2)}</p>
  `;
  DOM.modalVenda.classList.add("active");

  DOM.confirmarVenda.onclick = async () => {
    try {
      await Promise.all(currentSale.map(item => addDoc(collection(db, "sales"), {
        nome, telefone, produto: item.nome, qtd: item.qtd, total: item.qtd * item.preco,
        data: formattedDate, pago: false, timestamp: new Date()
      })));

      alert("Venda registrada com sucesso!");
      currentSale = [];
      DOM.formSale.reset();
      setTodayDate();
      renderCurrentSale();
      await loadSales(); // Atualiza o histórico na hora
      DOM.modalVenda.classList.remove("active");
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar venda.");
    }
  };

  DOM.cancelarVenda.onclick = () => DOM.modalVenda.classList.remove("active");
});

// === DESPESAS ===
DOM.formExpense.addEventListener("submit", async e => {
  e.preventDefault();
  const categoria = DOM.formExpense.querySelector("#categoria-despesa").value;
  const descricao = DOM.formExpense.querySelector("#descricao-despesa").value.trim();
  const valor = parseFloat(DOM.formExpense.querySelector("#valor-despesa").value);
  const data = DOM.formExpense.querySelector("#data-despesa").value;
  if (!categoria || !descricao || !valor || !data) return alert("Preencha todos os campos!");
  const formattedDate = toLocalISODate(data);

  DOM.modalDespesaDetalhes.innerHTML = `
    <p><strong>Categoria:</strong> ${categoria}</p>
    <p><strong>Descrição:</strong> ${descricao}</p>
    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
    <p><strong>Data:</strong> ${formatarDataBrasileira(data)}</p>
  `;
  DOM.modalDespesa.classList.add("active");

  DOM.confirmarDespesa.onclick = async () => {
    try {
      await addDoc(collection(db, "expenses"), { categoria, descricao, valor, data: formattedDate, timestamp: new Date() });
      alert("Despesa registrada com sucesso!");
      DOM.formExpense.reset();
      await loadExpenses();
      DOM.modalDespesa.classList.remove("active");
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar despesa.");
    }
  };
  DOM.cancelarDespesa.onclick = () => DOM.modalDespesa.classList.remove("active");
});

async function loadSales() {
  const snapshot = await getDocs(collection(db, "sales"));
  completedSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  currentPage = 1;
  renderSalesTable();
  groupByClient();
  updateFinanceSummary();
}

async function loadExpenses() {
  const snapshot = await getDocs(collection(db, "expenses"));
  currentExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  expensePage = 1;
  renderExpenseTable();
  renderExpenseChart();
  updateFinanceSummary();
}

function renderExpenseChart() {
  const canvas = document.getElementById("expense-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const categories = [...new Set(currentExpenses.map(e => e.categoria))];
  const data = categories.map(cat => currentExpenses.filter(e => e.categoria === cat).reduce((s, e) => s + Number(e.valor || 0), 0));
  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels: categories, datasets: [{ data, backgroundColor: ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#f87171"] }] },
    options: { responsive: true, plugins: { legend: { position: "top" }, title: { display: true, text: "Despesas por Categoria" } } },
  });
}

async function removeSale(id) {
  if (!confirm("Tem certeza que deseja remover esta venda?")) return;
  await deleteDoc(doc(db, "sales", id));
  await loadSales();
}

function renderSalesTable() {
  let filtered = getFilteredSales();
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  DOM.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  DOM.prevPage.disabled = currentPage === 1;
  DOM.nextPage.disabled = currentPage === totalPages;

  const header = `<div class="grid grid-cols-8 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
    <div>Cliente</div><div>Produto</div><div>Qtd</div><div>Data</div><div>Telefone</div><div>Status</div><div>Valor</div><div>Ações</div>
  </div>`;

  const rows = paginated.map(s => `
    <div class="grid grid-cols-8 gap-4 p-3 ${s.pago ? "bg-green-50" : "bg-red-50"} border-b">
      <div>${s.nome}</div>
      <div>${s.produto}</div>
      <div>${s.qtd}</div>
      <div>${formatarDataBrasileira(s.data)}</div>
      <div>${s.telefone}</div>
      <div>
        <label class="status-toggle">
          <input type="checkbox" data-id="${s.id}" ${s.pago ? "checked" : ""} />
          <span class="toggle-slider ${s.pago ? "paid" : "unpaid"}"></span>
        </label>
      </div>
      <div>R$ ${Number(s.total).toFixed(2)}</div>
      <div><button class="remover-venda-btn bg-red-600 text-white px-3 py-1 rounded" data-id="${s.id}">Remover</button></div>
    </div>
  `).join("");

  DOM.compradoresDiv.innerHTML = header + (rows || "<div class='p-6 text-center col-span-8'>Nenhuma venda encontrada</div>");

  DOM.compradoresDiv.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", async e => {
      const id = e.target.dataset.id;
      const pago = e.target.checked;
      await updateDoc(doc(db, "sales", id), { pago });
      completedSales.find(s => s.id === id).pago = pago;
      renderSalesTable();
      groupByClient();
      updateFinanceSummary();
    });
  });

  DOM.compradoresDiv.querySelectorAll(".remover-venda-btn").forEach(btn => btn.addEventListener("click", () => removeSale(btn.dataset.id)));
}

function groupByClient() {
  let filtered = getFilteredSales();
  const grouped = filtered.reduce((acc, sale) => {
    const key = sale.nome;
    if (!acc[key]) acc[key] = { quantidade: 0, total: 0, telefone: sale.telefone, allPaid: true };
    acc[key].quantidade += sale.qtd;
    acc[key].total += sale.total;
    acc[key].allPaid = acc[key].allPaid && sale.pago;
    return acc;
  }, {});

  const header = `<div class="grid grid-cols-5 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
    <div>Cliente</div><div>Telefone</div><div>Qtd Total</div><div>Valor Total</div><div>Status</div>
  </div>`;

  const rows = Object.entries(grouped).map(([nome, data]) => `
    <div class="grid grid-cols-5 gap-4 p-3 ${data.allPaid ? "bg-green-50" : "bg-red-50"} border-b">
      <div>${nome}</div>
      <div>${data.telefone}</div>
      <div>${data.quantidade}</div>
      <div>R$ ${data.total.toFixed(2)}</div>
      <div>
        <label class="status-toggle">
          <input type="checkbox" data-client="${nome}" ${data.allPaid ? "checked" : ""} />
          <span class="toggle-slider ${data.allPaid ? "paid" : "unpaid"}"></span>
        </label>
      </div>
    </div>
  `).join("");

  DOM.clientDebtsDiv.innerHTML = header + (rows || "<div class='p-6 text-center col-span-5'>Nenhum cliente encontrado</div>");

  DOM.clientDebtsDiv.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", async e => {
      const clientName = e.target.dataset.client;
      const pago = e.target.checked;
      const salesToUpdate = completedSales.filter(s => s.nome === clientName);
      await Promise.all(salesToUpdate.map(s => updateDoc(doc(db, "sales", s.id), { pago })));
      salesToUpdate.forEach(s => s.pago = pago);
      renderSalesTable();
      groupByClient();
      updateFinanceSummary();
    });
  });
}

function renderExpenseTable() {
  let filtered = currentExpenses;
  if (DOM.filterECategoria.value) filtered = filtered.filter(e => e.categoria.toLowerCase().includes(DOM.filterECategoria.value.toLowerCase()));
  if (DOM.filterEDescricao.value) filtered = filtered.filter(e => e.descricao.toLowerCase().includes(DOM.filterEDescricao.value.toLowerCase()));
  if (DOM.filterEStart.value) filtered = filtered.filter(e => e.data >= DOM.filterEStart.value);
  if (DOM.filterEEnd.value) filtered = filtered.filter(e => e.data <= DOM.filterEEnd.value);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (expensePage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  DOM.expensePageInfo.textContent = `Página ${expensePage} de ${totalPages}`;
  DOM.prevExpensePage.disabled = expensePage === 1;
  DOM.nextExpensePage.disabled = expensePage === totalPages;

  const header = `<div class="grid grid-cols-4 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
    <div>Categoria</div><div>Descrição</div><div>Valor</div><div>Data</div>
  </div>`;

  const rows = paginated.map(e => `
    <div class="grid grid-cols-4 gap-4 p-3 bg-white border-b">
      <div>${e.categoria}</div>
      <div>${e.descricao}</div>
      <div>R$ ${Number(e.valor).toFixed(2)}</div>
      <div>${formatarDataBrasileira(e.data)}</div>
    </div>
  `).join("");

  DOM.despesasDiv.innerHTML = header + (rows || "<div class='p-6 text-center col-span-4'>Nenhuma despesa encontrada</div>");
}

function getFilteredExpenses() {
  let filtered = [...currentExpenses];
  if (DOM.filterEStart.value) filtered = filtered.filter(e => e.data >= DOM.filterEStart.value);
  if (DOM.filterEEnd.value) filtered = filtered.filter(e => e.data <= DOM.filterEEnd.value);
  return filtered;
}

function updateFinanceSummary() {
  const sales = getFilteredSales();
  const expenses = getFilteredExpenses();
  const totalVendas = sales.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalRecebido = sales.filter(v => v.pago).reduce((s, v) => s + Number(v.total || 0), 0);
  const totalAberto = totalVendas - totalRecebido;
  const totalDespesas = expenses.reduce((s, e) => s + Number(e.valor || 0), 0);
  const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  DOM.sumVendas.textContent = fmt(totalVendas);
  DOM.sumRecebido.textContent = fmt(totalRecebido);
  DOM.sumAberto.textContent = fmt(totalAberto);
  DOM.sumDespesas.textContent = fmt(totalDespesas);
}

DOM.exportData.addEventListener("click", () => {
  const data = completedSales.map(s => ({
    Cliente: s.nome, Produto: s.produto, Quantidade: s.qtd, Data: s.data, Telefone: s.telefone,
    Pago: s.pago ? "Sim" : "Não", Valor: s.total,
  }));
  if (!data.length) return alert("Nenhum dado para exportar.");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  XLSX.writeFile(wb, "vendas.xlsx");
});

const debouncedUpdate = debounce(() => {
  renderSalesTable();
  groupByClient();
  updateFinanceSummary();
  renderExpenseTable();
}, 300);

[DOM.filterClient, DOM.filterStart, DOM.filterEnd, DOM.filterStatus, DOM.filterProduct,
 DOM.filterClientDebts, DOM.filterStatusDebts, DOM.filterECategoria, DOM.filterEDescricao,
 DOM.filterEStart, DOM.filterEEnd].forEach(el => el?.addEventListener("input", debouncedUpdate));

DOM.prevPage.onclick = () => { if (currentPage > 1) { currentPage--; renderSalesTable(); } };
DOM.nextPage.onclick = () => { currentPage++; renderSalesTable(); };
DOM.prevExpensePage.onclick = () => { if (expensePage > 1) { expensePage--; renderExpenseTable(); } };
DOM.nextExpensePage.onclick = () => { expensePage++; renderExpenseTable(); };

function activateTab(tabId) {
  DOM.tabContents.forEach(c => c.classList.toggle("hidden", c.id !== tabId));
  DOM.tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  if (tabId === "new-sale") {
    setTodayDate();
  }
}
DOM.tabs.forEach(tab => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

// Inicialização
renderProducts();
renderCurrentSale();
setTodayDate();
Promise.all([loadSales(), loadExpenses()]).then(() => {
  updateFinanceSummary();
  activateTab("new-sale");
});