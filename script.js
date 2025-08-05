// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCFGN-HlN620RFrFAw2ty-KU4gRWrWXtIE",
  authDomain: "brigadeirospainel.firebaseapp.com",
  projectId: "brigadeirospainel",
  storageBucket: "brigadeirospainel.appspot.com",
  messagingSenderId: "786298308276",
  appId: "1:786298308276:web:a548c7b7e604c4d88b79e1",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Dados iniciais ---
const PRODUCTS = [
  { id: "brigadeiro-tradicional", nome: "Brigadeiro Tradicional", preco: 2.5, imagem: "Brigadeiro.jpg" },
];

let currentSale = [];
let currentExpenses = [];
let completedSales = [];

// Cache DOM
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
};

// --- Renderização dos produtos para venda ---
function renderProducts() {
  DOM.produtosDiv.innerHTML = "";
  PRODUCTS.forEach(({ id, nome, preco, imagem }) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${imagem}" alt="${nome}" />
      <h4>${nome}</h4>
      <p>R$ ${preco.toFixed(2)}</p>
      <button data-id="${id}" type="button" aria-label="Adicionar ${nome} à venda">Adicionar</button>
    `;
    card.querySelector("button").addEventListener("click", () => addToSale({ id, nome, preco }));
    DOM.produtosDiv.appendChild(card);
  });
}

// --- Adiciona produto à venda atual ---
function addToSale(prod) {
  const item = currentSale.find(i => i.id === prod.id);
  if (item) {
    item.qtd++;
  } else {
    currentSale.push({ ...prod, qtd: 1 });
  }
  renderCurrentSale();
}

// --- Exibe resumo da venda atual ---
function renderCurrentSale() {
  if (!currentSale.length) {
    DOM.vendaAtualDiv.innerHTML = "<em>Sem itens</em>";
    return;
  }
  DOM.vendaAtualDiv.innerHTML = currentSale
    .map(({ nome, qtd, preco }) => `${nome} x${qtd} — <strong>R$ ${(qtd * preco).toFixed(2)}</strong><br>`)
    .join("");
}

// --- Envio do formulário de nova venda ---
DOM.formSale.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentSale.length) {
    alert("Adicione itens!");
    return;
  }

  const nome = document.getElementById("nome").value.trim();
  if (!nome) {
    alert("Informe o nome do cliente.");
    return;
  }

  const telefone = document.getElementById("telefone").value.trim() || "N/A";
  const data = document.getElementById("data").value;
  if (!data) {
    alert("Informe a data da venda.");
    return;
  }

  try {
    // Salvar todas as vendas no Firestore
    await Promise.all(
      currentSale.map(item =>
        db.collection("sales").add({
          nome,
          telefone,
          produto: item.nome,
          qtd: item.qtd,
          total: item.qtd * item.preco,
          data,
          pago: false,
        })
      )
    );

    alert("Venda salva com sucesso!");
    currentSale = [];
    DOM.formSale.reset();
    renderCurrentSale();
    await loadSales();
    activateTab("sales-history"); // Ir para histórico após venda
  } catch (error) {
    console.error("Erro ao salvar venda:", error);
    alert("Erro ao salvar venda. Tente novamente.");
  }
});

// --- Envio do formulário de despesas ---
DOM.formExpense.addEventListener("submit", async e => {
  e.preventDefault();
  const categoria = document.getElementById("categoria-despesa").value;
  const descricao = document.getElementById("descricao-despesa").value.trim();
  const valor = parseFloat(document.getElementById("valor-despesa").value);
  const data = document.getElementById("data-despesa").value;

  if (!categoria || !descricao || !valor || !data) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  try {
    await db.collection("expenses").add({ categoria, descricao, valor, data });
    alert("Despesa registrada com sucesso!");
    e.target.reset();
    await loadExpenses();
    activateTab("expenses");
  } catch (error) {
    console.error("Erro ao registrar despesa:", error);
    alert("Erro ao registrar despesa. Tente novamente.");
  }
});

// --- Carrega vendas do Firestore ---
async function loadSales() {
  try {
    const snapshot = await db.collection("sales").get();
    completedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderSalesTable();
  } catch (error) {
    console.error("Erro ao carregar vendas:", error);
    alert("Erro ao carregar vendas.");
  }
}

// --- Renderiza tabela de vendas filtrada ---
function renderSalesTable() {
  let filtered = [...completedSales];

  if (DOM.filterClient.value) {
    filtered = filtered.filter(s => s.nome.toLowerCase().includes(DOM.filterClient.value.toLowerCase()));
  }
  if (DOM.filterProduct.value) {
    filtered = filtered.filter(s => s.produto.toLowerCase().includes(DOM.filterProduct.value.toLowerCase()));
  }
  if (DOM.filterStatus.value) {
    const statusPago = DOM.filterStatus.value === "pago";
    filtered = filtered.filter(s => s.pago === statusPago);
  }
  if (DOM.filterStart.value) {
    filtered = filtered.filter(s => s.data >= DOM.filterStart.value);
  }
  if (DOM.filterEnd.value) {
    filtered = filtered.filter(s => s.data <= DOM.filterEnd.value);
  }

  const header = `
    <div class="table-header">
      <div>Cliente</div><div>Produto</div><div>Telefone</div><div>Data</div><div>Status</div><div>Valor</div>
    </div>`;

  const rows = filtered.length
    ? filtered
        .map(
          s => `
          <div class="table-row ${s.pago ? "pago" : "nao-pago"}">
            <div>${s.nome}</div>
            <div>${s.produto} (x${s.qtd})</div>
            <div>${s.telefone}</div>
            <div>${new Date(s.data).toLocaleDateString("pt-BR")}</div>
            <div>
              <label>
                <input type="checkbox" data-id="${s.id}" ${s.pago ? "checked" : ""} aria-label="Marcar venda como paga" />
                ${s.pago ? "Pago" : "Não Pago"}
              </label>
            </div>
            <div>R$ ${s.total.toFixed(2)}</div>
          </div>`
        )
        .join("")
    : `<div class="table-row"><div colspan="6"><em>Nenhuma venda encontrada</em></div></div>`;

  DOM.compradoresDiv.innerHTML = header + rows;

  // Atualiza status pago sem reload completo
  DOM.compradoresDiv.querySelectorAll("input[type=checkbox]").forEach(checkbox => {
    checkbox.addEventListener("change", async e => {
      const id = e.target.dataset.id;
      const pago = e.target.checked;
      try {
        await db.collection("sales").doc(id).update({ pago });
        // Atualizar localmente para evitar reload
        const sale = completedSales.find(s => s.id === id);
        if (sale) sale.pago = pago;
        renderSalesTable(); // re-render para refletir status visual
      } catch (error) {
        console.error("Erro ao atualizar status pago:", error);
        alert("Erro ao atualizar status de pagamento.");
        e.target.checked = !pago; // Reverte checkbox no erro
      }
    });
  });
}

// --- Carrega despesas do Firestore ---
async function loadExpenses() {
  try {
    const snapshot = await db.collection("expenses").get();
    currentExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderExpenseTable();
  } catch (error) {
    console.error("Erro ao carregar despesas:", error);
    alert("Erro ao carregar despesas.");
  }
}

// --- Renderiza tabela de despesas com filtro ---
function renderExpenseTable() {
  let filtered = [...currentExpenses];

  if (DOM.filterECategoria.value) {
    filtered = filtered.filter(e => e.categoria.toLowerCase().includes(DOM.filterECategoria.value.toLowerCase()));
  }
  if (DOM.filterEDescricao.value) {
    filtered = filtered.filter(e => e.descricao.toLowerCase().includes(DOM.filterEDescricao.value.toLowerCase()));
  }
  if (DOM.filterEStart.value) {
    filtered = filtered.filter(e => e.data >= DOM.filterEStart.value);
  }
  if (DOM.filterEEnd.value) {
    filtered = filtered.filter(e => e.data <= DOM.filterEEnd.value);
  }

  const header = `
    <div class="table-header">
      <div>Categoria</div><div>Descrição</div><div>Valor</div><div>Data</div>
    </div>`;

  const rows = filtered.length
    ? filtered
        .map(
          e => `
          <div class="table-row expense-row">
            <div>${e.categoria}</div>
            <div>${e.descricao}</div>
            <div>R$ ${e.valor.toFixed(2)}</div>
            <div>${new Date(e.data).toLocaleDateString("pt-BR")}</div>
          </div>`
        )
        .join("")
    : `<div class="table-row"><div colspan="4"><em>Nenhuma despesa encontrada</em></div></div>`;

  DOM.despesasDiv.innerHTML = header + rows;
}

// --- Adiciona listeners aos filtros para atualização dinâmica ---
const salesFilters = [
  DOM.filterClient,
  DOM.filterStart,
  DOM.filterEnd,
  DOM.filterStatus,
  DOM.filterProduct,
];

const expenseFilters = [
  DOM.filterECategoria,
  DOM.filterEDescricao,
  DOM.filterEStart,
  DOM.filterEEnd,
];

salesFilters.forEach(input => input.addEventListener("input", renderSalesTable));
expenseFilters.forEach(input => input.addEventListener("input", renderExpenseTable));

// --- Controle das abas com acessibilidade ---
function activateTab(tabId) {
  DOM.tabContents.forEach(content => {
    const active = content.id === tabId;
    content.classList.toggle("active", active);
    content.setAttribute("aria-hidden", !active);
    content.tabIndex = active ? 0 : -1;
  });

  DOM.tabs.forEach(tab => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active);
    tab.tabIndex = active ? 0 : -1;
    if (active) tab.focus();
  });
}

DOM.tabs.forEach(tab => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  tab.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const tabsArray = Array.from(DOM.tabs);
      let index = tabsArray.indexOf(e.target);
      if (e.key === "ArrowRight") index = (index + 1) % tabsArray.length;
      else index = (index - 1 + tabsArray.length) % tabsArray.length;
      tabsArray[index].click();
    }
  });
});


// --- Inicialização ---
renderProducts();
loadSales();
loadExpenses();
renderCurrentSale();
activateTab("new-sale"); // inicia na aba Nova Venda
