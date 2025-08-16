import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config (mover para backend em produção)
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

// Produtos (pode expandir aqui)
const PRODUCTS = [
  { id: "brigadeiro-tradicional", nome: "Brigadeiro Tradicional", preco: 2.5, imagem: "foco.jpg" },
];

let currentSale = [];
let currentExpenses = [];
let completedSales = [];
let currentPage = 1;
let expensePage = 1;
const itemsPerPage = 10;

// ==== DOM refs ====
const DOM = {
  produtosDiv: document.getElementById("produtos"),
  formSale: document.getElementById("form-venda"),
  vendaAtualDiv: document.getElementById("venda-atual"),
  compradoresDiv: document.getElementById("compradores"),
  tabs: document.querySelectorAll(".tab"),
  tabContents: document.querySelectorAll(".tab-content"),
  filterClient: document.getElementById("filtro-cliente"),
  filterStart: document.getElementById("filtro-data-inicio"),
  filterEnd: document.getElementById("filtro-data-fim"),
  filterStatus: document.getElementById("filtro-status"),
  filterProduct: document.getElementById("filtro-produto"),
  exportData: document.getElementById("export-data"),
  importDataInput: document.getElementById("import-data"),
  importDataBtn: document.getElementById("import-data-btn"),
  formExpense: document.getElementById("form-despesa"),
  despesasDiv: document.getElementById("despesas"),
  filterECategoria: document.getElementById("filtro-despesa-categoria"),
  filterEDescricao: document.getElementById("filtro-despesa-descricao"),
  filterEStart: document.getElementById("filtro-despesa-data-inicio"),
  filterEEnd: document.getElementById("filtro-despesa-data-fim"),
  exportExpensesBtn: document.getElementById("export-expenses"),
  importExpensesBtn: document.getElementById("import-expenses-btn"),
  importExpensesInput: document.getElementById("import-expenses"),
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
  totalSales: document.getElementById("total-sales"),
  // Resumo Financeiro
  sumVendas: document.getElementById("sum-vendas"),
  sumRecebido: document.getElementById("sum-recebido"),
  sumAberto: document.getElementById("sum-aberto"),
  sumDespesas: document.getElementById("sum-despesas"),
  sumSaldo: document.getElementById("sum-saldo"),
};

let expenseChart = null;
let financeChart = null;
let salesTrendChart = null;

// Util: debounce
function debounce(func, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
}

// ...existing code...
function toLocalISODate(dateInput) {
  // dateInput: "YYYY-MM-DD"
  const [year, month, day] = dateInput.split('-').map(Number);
  // Garante dois dígitos para mês e dia
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
// ...existing code...


// ==== Gráficos ====
function renderExpenseChart() {
  const canvas = document.getElementById("expense-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const categories = [...new Set(currentExpenses.map(e => e.categoria))];
  const data = categories.map(cat =>
    currentExpenses.filter(e => e.categoria === cat).reduce((s, e) => s + Number(e.valor || 0), 0)
  );

  

  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels: categories, datasets: [{ data }] },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" }, title: { display: true, text: "Despesas por Categoria" } },
    },
  });
}

function renderFinanceChart() {
  const canvas = document.getElementById("finance-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Get date filters
  const startDate = DOM.filterStart.value || "1900-01-01";
  const endDate = DOM.filterEnd.value || "9999-12-31";

  // Filter sales and expenses by date range
  const filteredSales = completedSales.filter(s => s.data >= startDate && s.data <= endDate);
  const filteredExpenses = currentExpenses.filter(e => e.data >= startDate && e.data <= endDate);

  // Calculate totals for the period
  const totalVendas = filteredSales.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalRecebido = filteredSales.filter(v => v.pago).reduce((s, v) => s + Number(v.total || 0), 0);
  const totalAberto = totalVendas - totalRecebido;
  const totalDespesas = filteredExpenses.reduce((s, e) => s + Number(e.valor || 0), 0);
  const saldo = totalRecebido - totalDespesas;

  if (financeChart) financeChart.destroy();
  financeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Vendas", "Recebido", "Em Aberto", "Despesas", "Saldo"],
      datasets: [{
        label: "R$ (valores agregados)",
        data: [totalVendas, totalRecebido, totalAberto, totalDespesas, saldo],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#FF9F40", "#4BC0C0"],
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: `Resumo Financeiro (${startDate ? new Date(startDate).toLocaleDateString("pt-BR") : "Início"} - ${endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "Hoje"})`
        }
      },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderSalesTrendChart() {
  const canvas = document.getElementById("sales-trend-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Get date filters
  const startDate = DOM.filterStart.value || "1900-01-01";
  const endDate = DOM.filterEnd.value || "9999-12-31";

  // Filter sales by date range
  const filteredSales = completedSales.filter(s => s.data >= startDate && s.data <= endDate);

  // Group sales by date
  const salesByDate = filteredSales.reduce((acc, sale) => {
    const date = sale.data;
    if (!acc[date]) acc[date] = { total: 0, count: 0 };
    acc[date].total += Number(sale.total || 0);
    acc[date].count += Number(sale.qtd || 0);
    return acc;
  }, {});

  // Prepare chart data
  const labels = Object.keys(salesByDate).sort();
  const totals = labels.map(date => salesByDate[date].total);

  if (salesTrendChart) salesTrendChart.destroy();
  salesTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.map(date => new Date(date).toLocaleDateString("pt-BR")),
      datasets: [{
        label: "Vendas por Dia (R$)",
        data: totals,
        borderColor: "#36A2EB",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: {
          display: true,
          text: `Vendas por Dia (${startDate ? new Date(startDate).toLocaleDateString("pt-BR") : "Início"} - ${endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "Hoje"})`
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function updateFinanceSummary() {
  // Get date filters
  const startDate = DOM.filterStart.value || "1900-01-01"; // Fallback to a very early date
  const endDate = DOM.filterEnd.value || "9999-12-31"; // Fallback to a far future date

  // Filter sales and expenses by date range
  const filteredSales = completedSales.filter(s => s.data >= startDate && s.data <= endDate);
  const filteredExpenses = currentExpenses.filter(e => e.data >= startDate && e.data <= endDate);

  // Calculate totals for the period
  const totalVendas = filteredSales.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalRecebido = filteredSales.filter(v => v.pago).reduce((s, v) => s + Number(v.total || 0), 0);
  const totalAberto = totalVendas - totalRecebido;
  const totalDespesas = filteredExpenses.reduce((s, e) => s + Number(e.valor || 0), 0);
  const saldo = totalRecebido - totalDespesas;

  // Format values for display
  const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Update DOM elements
  if (DOM.sumVendas) DOM.sumVendas.textContent = fmt(totalVendas);
  if (DOM.sumRecebido) DOM.sumRecebido.textContent = fmt(totalRecebido);
  if (DOM.sumAberto) DOM.sumAberto.textContent = fmt(totalAberto);
  if (DOM.sumDespesas) DOM.sumDespesas.textContent = fmt(totalDespesas);
  if (DOM.sumSaldo) DOM.sumSaldo.textContent = fmt(saldo);

  // Update total sales card in history
  if (DOM.totalSales) {
    const qtd = filteredSales.length;
    DOM.totalSales.textContent = `Total de Vendas: ${fmt(totalVendas)} — Itens: ${qtd}`;
  }

  // Render the updated finance chart
  renderFinanceChart();
}

// ==== Produtos / Venda Atual ====
function renderProducts() {
  DOM.produtosDiv.innerHTML = "";
  PRODUCTS.forEach(({ id, nome, preco, imagem }) => {
    const card = document.createElement("div");
    card.className = "product-card shadow hover:shadow-lg transition";
    card.innerHTML = `
      <img src="${imagem}" alt="${nome}" class="w-full h-32 object-cover" />
      <div class="p-3">
        <h4 class="font-semibold">${nome}</h4>
        <p>R$ ${preco.toFixed(2)}</p>
        <button data-id="${id}" type="button" class="mt-2 bg-pink-600 text-white py-1 px-3 rounded-lg hover:bg-pink-700">Adicionar</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => addToSale({ id, nome, preco }));
    DOM.produtosDiv.appendChild(card);
  });
}

function addToSale(prod) {
  const item = currentSale.find(i => i.id === prod.id);
  if (item) item.qtd++;
  else currentSale.push({ ...prod, qtd: 1 });
  renderCurrentSale();
}

function renderCurrentSale() {
  if (!currentSale.length) {
    DOM.vendaAtualDiv.innerHTML = '<p class="text-gray-500 italic">Sem itens</p>';
    return;
  }
  DOM.vendaAtualDiv.innerHTML = currentSale.map(({ nome, qtd, preco }, index) => `
    <div class="order-item bg-white p-3 rounded-lg shadow mb-2">
      <span>${nome} x${qtd} — R$ ${(qtd * preco).toFixed(2)}</span>
      <button class="remover-btn" data-index="${index}">Remover</button>
    </div>
  `).join("");

  DOM.vendaAtualDiv.querySelectorAll(".remover-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      currentSale.splice(index, 1);
      renderCurrentSale();
    });
  });
}

// ==== Registro de Venda ====
DOM.formSale.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentSale.length) return alert("Adicione pelo menos um item à venda!");

  const nome = DOM.formSale.querySelector("#nome").value.trim();
  const telefone = DOM.formSale.querySelector("#telefone").value.trim() || "N/A";
  const data = DOM.formSale.querySelector("#data").value;
  if (!nome || !data) return alert("Preencha todos os campos obrigatórios!");

  let formattedDate;
  try { formattedDate = toLocalISODate(data); }
  catch { return alert("Data inválida. Por favor, selecione uma data válida."); }

  DOM.modalVendaDetalhes.innerHTML = `
    <p><strong>Cliente:</strong> ${nome}</p>
    <p><strong>Telefone:</strong> ${telefone}</p>
    <p><strong>Data:</strong> ${formattedDate.split("-").reverse().join("/")}</p>
    <p><strong>Itens:</strong></p>
    <ul class="list-disc pl-5">${currentSale.map(i => `<li>${i.nome} x${i.qtd} - R$ ${(i.qtd * i.preco).toFixed(2)}</li>`).join("")}</ul>
    <p><strong>Total:</strong> R$ ${currentSale.reduce((s,i)=>s+i.qtd*i.preco,0).toFixed(2)}</p>
`;

  DOM.modalVenda.classList.add("active");

  DOM.confirmarVenda.onclick = async () => {
    try {
      await Promise.all(currentSale.map(item =>
        addDoc(collection(db, "sales"), {
          nome, telefone,
          produto: item.nome, qtd: item.qtd, total: item.qtd * item.preco,
          data: formattedDate, pago: false, timestamp: new Date(),
        })
      ));
      alert("Venda registrada com sucesso!");
      currentSale = [];
      DOM.formSale.reset();
      renderCurrentSale();
      await loadSales();
      updateFinanceSummary();
      activateTab("sales-history");
      DOM.modalVenda.classList.remove("active");
    } catch (err) {
      console.error("Erro ao salvar venda:", err);
      alert("Erro ao registrar venda. Tente novamente.");
    }
  };
  DOM.cancelarVenda.onclick = () => DOM.modalVenda.classList.remove("active");
});

// ==== Registro de Despesa ====
DOM.formExpense.addEventListener("submit", async e => {
  e.preventDefault();
  const categoria = DOM.formExpense.querySelector("#categoria-despesa").value;
  const descricao = DOM.formExpense.querySelector("#descricao-despesa").value.trim();
  const valor = parseFloat(DOM.formExpense.querySelector("#valor-despesa").value);
  const data = DOM.formExpense.querySelector("#data-despesa").value;
  if (!categoria || !descricao || !valor || !data) return alert("Preencha todos os campos obrigatórios!");

  let formattedDate;
  try { formattedDate = toLocalISODate(data); }
  catch { return alert("Data inválida. Por favor, selecione uma data válida."); }

  DOM.modalDespesaDetalhes.innerHTML = `
    <p><strong>Categoria:</strong> ${categoria}</p>
    <p><strong>Descrição:</strong> ${descricao}</p>
    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
    <p><strong>Data:</strong> ${new Date(formattedDate).toLocaleDateString("pt-BR")}</p>
  `;
  DOM.modalDespesa.classList.add("active");

  DOM.confirmarDespesa.onclick = async () => {
    try {
      await addDoc(collection(db, "expenses"), {
        categoria, descricao, valor, data: formattedDate, timestamp: new Date(),
      });
      alert("Despesa registrada com sucesso!");
      DOM.formExpense.reset();
      await loadExpenses();
      updateFinanceSummary();
      activateTab("expenses");
      DOM.modalDespesa.classList.remove("active");
    } catch (err) {
      console.error("Erro ao registrar despesa:", err);
      alert("Erro ao registrar despesa. Tente novamente.");
    }
  };
  DOM.cancelarDespesa.onclick = () => DOM.modalDespesa.classList.remove("active");
});

// ==== Carregar dados ====
async function loadSales() {
  try {
    const snapshot = await getDocs(collection(db, "sales"));
    completedSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    currentPage = 1;
    renderSalesTable();
    groupByClient();
  } catch (err) {
    console.error("Erro ao carregar vendas:", err);
    alert("Erro ao carregar vendas. Verifique sua conexão.");
  }
}

async function loadExpenses() {
  try {
    const snapshot = await getDocs(collection(db, "expenses"));
    currentExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    expensePage = 1;
    renderExpenseTable();
    renderExpenseChart();
  } catch (err) {
    console.error("Erro ao carregar despesas:", err);
    alert("Erro ao carregar despesas. Verifique sua conexão.");
  }
}

// ==== Tabelas / Ações ====
async function removeSale(id) {
  if (!confirm("Tem certeza que deseja remover esta venda? Esta ação não pode ser desfeita.")) return;
  try {
    await deleteDoc(doc(db, "sales", id));
    completedSales = completedSales.filter(s => s.id !== id);
    renderSalesTable();
    groupByClient();
    updateFinanceSummary();
    alert("Venda removida com sucesso!");
  } catch (err) {
    console.error("Erro ao remover venda:", err);
    alert("Erro ao remover venda. Tente novamente.");
  }
}

function renderSalesTable() {
  let filtered = [...completedSales];

  if (DOM.filterClient.value) filtered = filtered.filter(s => s.nome.toLowerCase().includes(DOM.filterClient.value.toLowerCase()));
  if (DOM.filterProduct.value) filtered = filtered.filter(s => s.produto.toLowerCase().includes(DOM.filterProduct.value.toLowerCase()));
  if (DOM.filterStatus.value) filtered = filtered.filter(s => s.pago === (DOM.filterStatus.value === "pago"));
  if (DOM.filterStart.value) filtered = filtered.filter(s => s.data >= DOM.filterStart.value);
  if (DOM.filterEnd.value) filtered = filtered.filter(s => s.data <= DOM.filterEnd.value);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedSales = filtered.slice(start, end);

  DOM.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  DOM.prevPage.disabled = currentPage === 1;
  DOM.nextPage.disabled = currentPage === totalPages;

  const header = `
    <div class="grid grid-cols-8 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
      <div>Cliente</div><div>Produto</div><div>Quantidade</div><div>Data</div><div>Telefone</div><div>Status</div><div>Valor</div><div>Ações</div>
    </div>`;

  const rows = paginatedSales.length ? paginatedSales.map(s => `
    <div class="grid grid-cols-8 gap-4 p-3 ${s.pago ? "bg-green-50" : "bg-red-50"} border-b">
      <div>${s.nome}</div>
      <div>${s.produto}</div>
      <div>${s.qtd}</div>
      <div>${s.data 
    ? new Date(new Date(s.data).getTime() + 3*60*60*1000).toLocaleDateString("pt-BR") 
    : "Data inválida"}
</div>

      <div>${s.telefone}</div>
      <div>
        <label class="status-toggle">
          <input type="checkbox" data-id="${s.id}" ${s.pago ? "checked" : ""} aria-label="Marcar venda como paga" />
          <span class="toggle-slider ${s.pago ? "paid" : "unpaid"}"></span>
          <span class="toggle-text">${s.pago ? "Pago" : "Não Pago"}</span>
        </label>
      </div>
      <div>R$ ${Number(s.total || 0).toFixed(2)}</div>
      <div><button class="remover-venda-btn" data-id="${s.id}">Remover</button></div>
    </div>
  `).join("") : `<div class="p-3 text-center"><em>Nenhuma venda encontrada</em></div>`;

  DOM.compradoresDiv.innerHTML = header + rows;

  // Handlers
  DOM.compradoresDiv.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", async e => {
      const id = e.target.dataset.id;
      const pago = e.target.checked;
      try {
        await updateDoc(doc(db, "sales", id), { pago });
        const sale = completedSales.find(s => s.id === id);
        if (sale) sale.pago = pago;
        renderSalesTable();
        groupByClient();
        updateFinanceSummary();
      } catch (err) {
        console.error("Erro ao atualizar status:", err);
        alert("Erro ao atualizar status de pagamento.");
        e.target.checked = !pago;
      }
    });
  });

  DOM.compradoresDiv.querySelectorAll(".remover-venda-btn").forEach(btn => {
    btn.addEventListener("click", () => removeSale(btn.dataset.id));
  });
}

async function updateClientPaymentStatus(clientName, pago) {
  try {
    const salesToUpdate = completedSales.filter(s => s.nome === clientName && s.pago !== pago);
    await Promise.all(salesToUpdate.map(sale => updateDoc(doc(db, "sales", sale.id), { pago })));
    salesToUpdate.forEach(sale => { sale.pago = pago; });
    renderSalesTable();
    groupByClient();
    updateFinanceSummary();
  } catch (err) {
    console.error("Erro ao atualizar status do cliente:", err);
    alert("Erro ao atualizar status de pagamento do cliente.");
    throw err;
  }
}

function groupByClient() {
  let filteredSales = [...completedSales];

  if (DOM.filterClientDebts.value) filteredSales = filteredSales.filter(s => s.nome.toLowerCase().includes(DOM.filterClientDebts.value.toLowerCase()));
  if (DOM.filterStatusDebts.value === "nao-pago") filteredSales = filteredSales.filter(s => !s.pago);
  if (DOM.filterStart.value) filteredSales = filteredSales.filter(s => s.data >= DOM.filterStart.value);
  if (DOM.filterEnd.value) filteredSales = filteredSales.filter(s => s.data <= DOM.filterEnd.value);

  const grouped = filteredSales.reduce((acc, sale) => {
    const { nome, qtd, total, telefone, pago } = sale;
    if (!acc[nome]) acc[nome] = { quantidade: 0, total: 0, telefone: telefone || "N/A", allPaid: true };
    acc[nome].quantidade += Number(qtd || 0);
    acc[nome].total += Number(total || 0);
    acc[nome].allPaid = acc[nome].allPaid && !!pago;
    return acc;
  }, {});

  renderClientDebts(grouped);
}

function renderClientDebts(groupedData) {
  const clientDebtsDiv = document.getElementById("client-debts");
  if (!clientDebtsDiv) return;

  const header = `
    <div class="grid grid-cols-5 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
      <div>Cliente</div><div>Telefone</div><div>Quantidade Total</div><div>Valor Total Devido</div><div>Status</div>
    </div>`;

  const rows = Object.keys(groupedData).length ? Object.entries(groupedData).map(([nome, { quantidade, total, telefone, allPaid }]) => `
    <div class="grid grid-cols-5 gap-4 p-3 ${allPaid ? "bg-green-50" : "bg-red-50"} border-b">
      <div>${nome}</div>
      <div>${telefone}</div>
      <div>${quantidade}</div>
      <div>R$ ${total.toFixed(2)}</div>
      <div>
        <label class="status-toggle">
          <input type="checkbox" data-client="${nome}" ${allPaid ? "checked" : ""} aria-label="Marcar dívidas de ${nome} como pagas"/>
          <span class="toggle-slider ${allPaid ? "paid" : "unpaid"}"></span>
          <span class="toggle-text">${allPaid ? "Pago" : "Não Pago"}</span>
        </label>
      </div>
    </div>
  `).join("") : `<div class="p-3 text-center"><em>Nenhum cliente com dívidas no período selecionado</em></div>`;

  clientDebtsDiv.innerHTML = header + rows;

  clientDebtsDiv.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", async e => {
      const clientName = e.target.dataset.client;
      const pago = e.target.checked;
      try { await updateClientPaymentStatus(clientName, pago); }
      catch { e.target.checked = !pago; }
    });
  });
}

function renderExpenseTable() {
  let filtered = [...currentExpenses];

  if (DOM.filterECategoria.value) filtered = filtered.filter(e => e.categoria.toLowerCase().includes(DOM.filterECategoria.value.toLowerCase()));
  if (DOM.filterEDescricao.value) filtered = filtered.filter(e => e.descricao.toLowerCase().includes(DOM.filterEDescricao.value.toLowerCase()));
  if (DOM.filterEStart.value) filtered = filtered.filter(e => e.data >= DOM.filterEStart.value);
  if (DOM.filterEEnd.value) filtered = filtered.filter(e => e.data <= DOM.filterEEnd.value);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (expensePage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filtered.slice(start, end);

  DOM.expensePageInfo.textContent = `Página ${expensePage} de ${totalPages}`;
  DOM.prevExpensePage.disabled = expensePage === 1;
  DOM.nextExpensePage.disabled = expensePage === totalPages;

  const header = `
    <div class="grid grid-cols-4 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
      <div>Categoria</div><div>Descrição</div><div>Valor</div><div>Data</div>
    </div>`;

  const rows = paginated.length ? paginated.map(e => `
    <div class="grid grid-cols-4 gap-4 p-3 bg-white border-b">
      <div>${e.categoria}</div>
      <div>${e.descricao}</div>
      <div>R$ ${Number(e.valor || 0).toFixed(2)}</div>
      <div>${e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "Data inválida"}</div>
    </div>
  `).join("") : `<div class="p-3 text-center"><em>Nenhuma despesa encontrada</em></div>`;

  DOM.despesasDiv.innerHTML = header + rows;
}

// ==== Export / Import (Vendas) ====
DOM.exportData.addEventListener("click", () => {
  const data = completedSales.map(s => ({
    Cliente: s.nome, Produto: s.produto, Quantidade: s.qtd, Data: s.data, Telefone: s.telefone,
    Pago: s.pago ? "Sim" : "Não", Valor: s.total,
  }));
  if (!data.length) return alert("Nenhum dado de vendas para exportar.");

  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "vendas.xlsx");
  } catch (err) {
    console.error("Erro ao exportar vendas:", err);
    alert("Erro ao exportar vendas.");
  }
});

DOM.importDataBtn.addEventListener("click", () => DOM.importDataInput.click());
DOM.importDataInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  // Corrige escopo de requiredFields para usar no catch também
  const requiredFields = ["Cliente", "Produto", "Quantidade", "Valor", "Data", "Pago", "Telefone"];
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws);

    const validData = json.filter(item =>
      requiredFields.every(field => item[field] !== undefined && item[field] !== null)
    );
    if (!validData.length) return alert("Arquivo sem colunas válidas: " + requiredFields.join(", "));

    await Promise.all(validData.map(item => {
      let formattedDate;
      try { formattedDate = toLocalISODate(item.Data); }
      catch { formattedDate = new Date().toISOString().split("T")[0]; }

      return addDoc(collection(db, "sales"), {
        nome: item.Cliente || "Desconhecido",
        produto: item.Produto || "Produto",
        qtd: parseInt(item.Quantidade, 10) || 1,
        total: parseFloat(item.Valor) || 0,
        data: formattedDate,
        pago: item.Pago === "Sim" || item.Pago === true,
        telefone: item.Telefone || "N/A",
        timestamp: new Date(),
      });
    }));
    alert("Vendas importadas com sucesso!");
    DOM.importDataInput.value = "";
    await loadSales();
    updateFinanceSummary();
  } catch (err) {
    console.error("Erro ao importar vendas:", err);
    alert("Erro ao importar vendas. Verifique colunas: " + requiredFields.join(", "));
  }
});

// ==== Export / Import (Despesas) ====
DOM.exportExpensesBtn.addEventListener("click", () => {
  const data = currentExpenses.map(e => ({
    Categoria: e.categoria, Descrição: e.descricao, Valor: e.valor, Data: e.data,
  }));
  if (!data.length) return alert("Nenhum dado de despesas para exportar.");

  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, "despesas.xlsx");
  } catch (err) {
    console.error("Erro ao exportar despesas:", err);
    alert("Erro ao exportar despesas.");
  }
});

DOM.importExpensesBtn.addEventListener("click", () => DOM.importExpensesInput.click());
DOM.importExpensesInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const requiredFields = ["Categoria", "Descrição", "Valor", "Data"];
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws);

    const valid = json.filter(item => requiredFields.every(f => item[f] !== undefined && item[f] !== null));
    if (!valid.length) return alert("Arquivo sem colunas válidas: " + requiredFields.join(", "));

    await Promise.all(valid.map(item => {
      let formattedDate;
      try { formattedDate = toLocalISODate(item.Data); }
      catch { formattedDate = new Date().toISOString().split("T")[0]; }

      return addDoc(collection(db, "expenses"), {
        categoria: item.Categoria || "Outros",
        descricao: item.Descrição || "Descrição não especificada",
        valor: parseFloat(item.Valor) || 0,
        data: formattedDate,
        timestamp: new Date(),
      });
    }));
    alert("Despesas importadas com sucesso!");
    DOM.importExpensesInput.value = "";
    await loadExpenses();
    updateFinanceSummary();
  } catch (err) {
    console.error("Erro ao importar despesas:", err);
    alert("Erro ao importar despesas. Verifique colunas: " + requiredFields.join(", "));
  }
});

// ==== Tabs / Navegação ====
function activateTab(tabId) {
  DOM.tabContents.forEach(c => {
    const active = c.id === tabId;
    c.classList.toggle("hidden", !active);
    c.classList.toggle("active", active);
    c.setAttribute("aria-hidden", !active);
    c.tabIndex = active ? 0 : -1;
  });
  DOM.tabs.forEach(t => {
    const active = t.dataset.tab === tabId;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active);
    t.tabIndex = active ? 0 : -1;
    if (active) t.focus();
  });
}
DOM.tabs.forEach(tab => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  tab.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const arr = Array.from(DOM.tabs);
      let i = arr.indexOf(e.target);
      i = e.key === "ArrowRight" ? (i + 1) % arr.length : (i - 1 + arr.length) % arr.length;
      arr[i].click();
    }
  });
});

// Paginação
DOM.prevPage.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderSalesTable(); } });
DOM.nextPage.addEventListener("click", () => {
  const filtered = completedSales.filter(s => {
    if (DOM.filterClient.value && !s.nome.toLowerCase().includes(DOM.filterClient.value.toLowerCase())) return false;
    if (DOM.filterProduct.value && !s.produto.toLowerCase().includes(DOM.filterProduct.value.toLowerCase())) return false;
    if (DOM.filterStatus.value && s.pago !== (DOM.filterStatus.value === "pago")) return false;
    if (DOM.filterStart.value && s.data < DOM.filterStart.value) return false;
    if (DOM.filterEnd.value && s.data > DOM.filterEnd.value) return false;
    return true;
  });
  if (currentPage < Math.ceil(Math.max(1, filtered.length) / itemsPerPage)) { currentPage++; renderSalesTable(); }
});
DOM.prevExpensePage.addEventListener("click", () => { if (expensePage > 1) { expensePage--; renderExpenseTable(); } });
DOM.nextExpensePage.addEventListener("click", () => {
  const filtered = currentExpenses.filter(e => {
    if (DOM.filterECategoria.value && !e.categoria.toLowerCase().includes(DOM.filterECategoria.value.toLowerCase())) return false;
    if (DOM.filterEDescricao.value && !e.descricao.toLowerCase().includes(DOM.filterEDescricao.value.toLowerCase())) return false;
    if (DOM.filterEStart.value && e.data < DOM.filterEStart.value) return false;
    if (DOM.filterEEnd.value && e.data > DOM.filterEEnd.value) return false;
    return true;
  });
  if (expensePage < Math.ceil(Math.max(1, filtered.length) / itemsPerPage)) { expensePage++; renderExpenseTable(); }
});

// Reatividade filtros
const debouncedRenderSales = debounce(() => { 
  renderSalesTable(); 
  groupByClient(); 
  updateFinanceSummary();
  renderSalesTrendChart();
}, 300);
const debouncedRenderExpenses = debounce(renderExpenseTable, 300);
const debouncedRenderClientDebts = debounce(() => {
  groupByClient();
  updateFinanceSummary();
  renderSalesTrendChart();
}, 300);

[DOM.filterClient, DOM.filterStart, DOM.filterEnd, DOM.filterStatus, DOM.filterProduct]
  .forEach(el => el.addEventListener("input", debouncedRenderSales));

[DOM.filterECategoria, DOM.filterEDescricao, DOM.filterEStart, DOM.filterEEnd]
  .forEach(el => el.addEventListener("input", debouncedRenderExpenses));

[DOM.filterClientDebts, DOM.filterStatusDebts, DOM.filterStart, DOM.filterEnd]
  .forEach(el => el.addEventListener("input", debouncedRenderClientDebts));

// ==== Inicialização ====
renderProducts();
await loadSales();
await loadExpenses();
renderCurrentSale();
updateFinanceSummary();
renderSalesTrendChart();
activateTab("new-sale");