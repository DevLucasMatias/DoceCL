import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config (move to backend in production)
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
    { id: "brigadeiro-tradicional", nome: "Brigadeiro Tradicional", preco: 2.5, imagem: "doce.jpg" },
];

let currentSale = [];
let currentExpenses = [];
let completedSales = [];
let currentPage = 1;
let expensePage = 1;
const itemsPerPage = 10;

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
};

let expenseChart = null;
function renderExpenseChart() {
    const ctx = document.getElementById("expense-chart").getContext("2d");
    const categories = [...new Set(currentExpenses.map(e => e.categoria))];
    const data = categories.map(cat => {
        return currentExpenses
            .filter(e => e.categoria === cat)
            .reduce((sum, e) => sum + e.valor, 0);
    });

    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: ["#28a745", "#007bff", "#1f1e1eff"],
                borderColor: "#ffffff",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Despesas por Categoria" },
            },
        },
    });
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function renderProducts() {
    DOM.produtosDiv.innerHTML = "";
    PRODUCTS.forEach(({ id, nome, preco, imagem }) => {
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-lg shadow hover:shadow-lg transition";
        card.innerHTML = `
            <img src="${imagem}" alt="${nome}" class="w-full h-32 object-cover rounded-t-lg" />
            <h4 class="text-lg font-semibold mt-2">${nome}</h4>
            <p class="text-pink-600 font-medium">R$ ${preco.toFixed(2)}</p>
            <button data-id="${id}" type="button" class="mt-2 bg-pink-600 text-white py-1 px-3 rounded-lg hover:bg-pink-700" aria-label="Adicionar ${nome} à venda">Adicionar</button>
        `;
        card.querySelector("button").addEventListener("click", () => addToSale({ id, nome, preco }));
        DOM.produtosDiv.appendChild(card);
    });
}

function addToSale(prod) {
    const item = currentSale.find(i => i.id === prod.id);
    if (item) {
        item.qtd++;
    } else {
        currentSale.push({ ...prod, qtd: 1 });
    }
    renderCurrentSale();
}

function renderCurrentSale() {
    if (!currentSale.length) {
        DOM.vendaAtualDiv.innerHTML = '<p class="text-gray-500 italic">Sem itens</p>';
        return;
    }
    DOM.vendaAtualDiv.innerHTML = currentSale
        .map(({ nome, qtd, preco }, index) => `
            <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow mb-2">
                <span>${nome} x${qtd} — R$ ${(qtd * preco).toFixed(2)}</span>
                <button class="remover-btn bg-red-600 text-white py-1 px-3 rounded-lg hover:bg-red-700" data-index="${index}" aria-label="Remover ${nome} da venda">Remover</button>
            </div>
        `)
        .join("");

    DOM.vendaAtualDiv.querySelectorAll(".remover-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = btn.dataset.index;
            currentSale.splice(index, 1);
            renderCurrentSale();
        });
    });
}

DOM.formSale.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentSale.length) {
        alert("Adicione pelo menos um item à venda!");
        return;
    }

    const nome = DOM.formSale.querySelector("#nome").value.trim();
    const telefone = DOM.formSale.querySelector("#telefone").value.trim() || "N/A";
    const data = DOM.formSale.querySelector("#data").value;

    if (!nome || !data) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

    let formattedDate;
    try {
        const dateObj = new Date(data);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Data inválida");
        }
        formattedDate = dateObj.toISOString().split("T")[0];
    } catch (error) {
        alert("Data inválida. Por favor, selecione uma data válida.");
        return;
    }

    DOM.modalVendaDetalhes.innerHTML = `
        <p><strong>Cliente:</strong> ${nome}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Data:</strong> ${new Date(formattedDate).toLocaleDateString("pt-BR")}</p>
        <p><strong>Itens:</strong></p>
        <ul class="list-disc pl-5">${currentSale.map(item => `<li>${item.nome} x${item.qtd} - R$ ${(item.qtd * item.preco).toFixed(2)}</li>`).join("")}</ul>
        <p><strong>Total:</strong> R$ ${currentSale.reduce((sum, item) => sum + item.qtd * item.preco, 0).toFixed(2)}</p>
    `;
    DOM.modalVenda.classList.add("active");

    DOM.confirmarVenda.onclick = async () => {
        try {
            await Promise.all(
                currentSale.map(item =>
                    addDoc(collection(db, "sales"), {
                        nome,
                        telefone,
                        produto: item.nome,
                        qtd: item.qtd,
                        total: item.qtd * item.preco,
                        data: formattedDate,
                        pago: false,
                        timestamp: new Date(),
                    })
                )
            );
            alert("Venda registrada com sucesso!");
            currentSale = [];
            DOM.formSale.reset();
            renderCurrentSale();
            await loadSales();
            activateTab("sales-history");
            DOM.modalVenda.classList.remove("active");
        } catch (error) {
            console.error("Erro ao salvar venda:", error);
            alert("Erro ao registrar venda. Tente novamente.");
        }
    };

    DOM.cancelarVenda.onclick = () => DOM.modalVenda.classList.remove("active");
});

DOM.formExpense.addEventListener("submit", async e => {
    e.preventDefault();
    const categoria = DOM.formExpense.querySelector("#categoria-despesa").value;
    const descricao = DOM.formExpense.querySelector("#descricao-despesa").value.trim();
    const valor = parseFloat(DOM.formExpense.querySelector("#valor-despesa").value);
    const data = DOM.formExpense.querySelector("#data-despesa").value;

    if (!categoria || !descricao || !valor || !data) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

    let formattedDate;
    try {
        const dateObj = new Date(data);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Data inválida");
        }
        formattedDate = dateObj.toISOString().split("T")[0];
    } catch (error) {
        alert("Data inválida. Por favor, selecione uma data válida.");
        return;
    }

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
                categoria,
                descricao,
                valor,
                data: formattedDate,
                timestamp: new Date(),
            });
            alert("Despesa registrada com sucesso!");
            DOM.formExpense.reset();
            await loadExpenses();
            activateTab("expenses");
            DOM.modalDespesa.classList.remove("active");
        } catch (error) {
            console.error("Erro ao registrar despesa:", error);
            alert("Erro ao registrar despesa. Tente novamente.");
        }
    };

    DOM.cancelarDespesa.onclick = () => DOM.modalDespesa.classList.remove("active");
});

async function loadSales() {
    try {
        const snapshot = await getDocs(collection(db, "sales"));
        completedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        currentPage = 1;
        renderSalesTable();
        groupByClient();
    } catch (error) {
        console.error("Erro ao carregar vendas:", error);
        alert("Erro ao carregar vendas. Verifique sua conexão.");
    }
}

async function removeSale(id) {
    if (!confirm("Tem certeza que deseja remover esta venda? Esta ação não pode ser desfeita.")) {
        return;
    }
    try {
        await deleteDoc(doc(db, "sales", id));
        completedSales = completedSales.filter(s => s.id !== id);
        renderSalesTable();
        groupByClient();
        alert("Venda removida com sucesso!");
    } catch (error) {
        console.error("Erro ao remover venda:", error);
        alert("Erro ao remover venda. Tente novamente.");
    }
}

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

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
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

    const rows = paginatedSales.length
        ? paginatedSales
            .map(
                s => `
                <div class="grid grid-cols-8 gap-4 p-3 ${s.pago ? "bg-green-50" : "bg-red-50"} border-b">
                    <div>${s.nome}</div>
                    <div>${s.produto}</div>
                    <div>${s.qtd}</div>
                    <div>${s.data ? new Date(s.data).toLocaleDateString("pt-BR") : "Data inválida"}</div>
                    <div>${s.telefone}</div>
                    <div>
                        <label class="status-toggle">
                            <input type="checkbox" data-id="${s.id}" ${s.pago ? "checked" : ""} aria-label="Marcar venda como paga" />
                            <span class="toggle-slider ${s.pago ? "paid" : "unpaid"}"></span>
                            <span class="toggle-text">${s.pago ? "Pago" : "Não Pago"}</span>
                        </label>
                    </div>
                    <div>R$ ${s.total.toFixed(2)}</div>
                    <div>
                        <button class="remover-venda-btn bg-red-600 text-white py-1 px-3 rounded-lg hover:bg-red-700" data-id="${s.id}" aria-label="Remover venda de ${s.nome}">Remover</button>
                    </div>
                </div>`
            )
            .join("")
        : `<div class="p-3 text-center"><em>Nenhuma venda encontrada</em></div>`;

    DOM.compradoresDiv.innerHTML = header + rows;

    DOM.compradoresDiv.querySelectorAll("input[type=checkbox]").forEach(checkbox => {
        checkbox.addEventListener("change", async e => {
            const id = e.target.dataset.id;
            const pago = e.target.checked;
            try {
                await updateDoc(doc(db, "sales", id), { pago });
                const sale = completedSales.find(s => s.id === id);
                if (sale) sale.pago = pago;
                renderSalesTable();
                groupByClient();
            } catch (error) {
                console.error("Erro ao atualizar status:", error);
                alert("Erro ao atualizar status de pagamento.");
                e.target.checked = !pago;
            }
        });
    });

    DOM.compradoresDiv.querySelectorAll(".remover-venda-btn").forEach(btn => {
        btn.addEventListener("click", () => removeSale(btn.dataset.id));
    });
}

function groupByClient() {
    let filteredSales = [...completedSales].filter(s => !s.pago);

    if (DOM.filterStart.value) {
        filteredSales = filteredSales.filter(s => s.data >= DOM.filterStart.value);
    }
    if (DOM.filterEnd.value) {
        filteredSales = filteredSales.filter(s => s.data <= DOM.filterEnd.value);
    }

    const groupedByClient = filteredSales.reduce((acc, sale) => {
        const { nome, qtd, total, telefone } = sale;
        if (!acc[nome]) {
            acc[nome] = { quantidade: 0, total: 0, telefone: telefone || "N/A" };
        }
        acc[nome].quantidade += qtd;
        acc[nome].total += total;
        return acc;
    }, {});

    renderClientDebts(groupedByClient);
}

function renderClientDebts(groupedData) {
    const clientDebtsDiv = document.getElementById("client-debts");
    if (!clientDebtsDiv) return;

    const header = `
        <div class="grid grid-cols-4 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
            <div>Cliente</div>
            <div>Telefone</div>
            <div>Quantidade Total</div>
            <div>Valor Total Devido</div>
        </div>`;

    const rows = Object.entries(groupedData).length
        ? Object.entries(groupedData)
            .map(([nome, { quantidade, total, telefone }]) => `
                <div class="grid grid-cols-4 gap-4 p-3 bg-red-50 border-b">
                    <div>${nome}</div>
                    <div>${telefone}</div>
                    <div>${quantidade}</div>
                    <div>R$ ${total.toFixed(2)}</div>
                </div>`)
            .join("")
        : `<div class="p-3 text-center"><em>Nenhum cliente com dívidas no período selecionado</em></div>`;

    clientDebtsDiv.innerHTML = header + rows;
}

async function loadExpenses() {
    try {
        const snapshot = await getDocs(collection(db, "expenses"));
        currentExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        expensePage = 1;
        renderExpenseTable();
        renderExpenseChart();
    } catch (error) {
        console.error("Erro ao carregar despesas:", error);
        alert("Erro ao carregar despesas. Verifique sua conexão.");
    }
}

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

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (expensePage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedExpenses = filtered.slice(start, end);

    DOM.expensePageInfo.textContent = `Página ${expensePage} de ${totalPages}`;
    DOM.prevExpensePage.disabled = expensePage === 1;
    DOM.nextExpensePage.disabled = expensePage === totalPages;

    const header = `
        <div class="grid grid-cols-4 gap-4 bg-gray-800 text-white p-3 rounded-t-lg font-semibold">
            <div>Categoria</div><div>Descrição</div><div>Valor</div><div>Data</div>
        </div>`;

    const rows = paginatedExpenses.length
        ? paginatedExpenses
            .map(
                e => `
                <div class="grid grid-cols-4 gap-4 p-3 bg-white border-b">
                    <div>${e.categoria}</div>
                    <div>${e.descricao}</div>
                    <div>R$ ${e.valor.toFixed(2)}</div>
                    <div>${e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "Data inválida"}</div>
                </div>`
            )
            .join("")
        : `<div class="p-3 text-center"><em>Nenhuma despesa encontrada</em></div>`;

    DOM.despesasDiv.innerHTML = header + rows;
}

DOM.exportData.addEventListener("click", () => {
    const data = completedSales.map(s => ({
        Cliente: s.nome,
        Produto: s.produto,
        Quantidade: s.qtd,
        Data: s.data,
        Telefone: s.telefone,
        Status: s.pago ? "Pago" : "Não Pago",
        Valor: s.total,
    }));

    if (!data.length) {
        alert("Nenhum dado de vendas para exportar.");
        return;
    }

    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vendas");
        XLSX.writeFile(wb, "vendas.xlsx");
    } catch (error) {
        console.error("Erro ao exportar vendas:", error);
        alert("Erro ao exportar vendas. Verifique o console para mais detalhes.");
    }
});

DOM.exportExpensesBtn.addEventListener("click", () => {
    const data = currentExpenses.map(e => ({
        Categoria: e.categoria,
        Descrição: e.descricao,
        Valor: e.valor,
        Data: e.data,
    }));

    if (!data.length) {
        alert("Nenhum dado de despesas para exportar.");
        return;
    }

    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Despesas");
        XLSX.writeFile(wb, "despesas.xlsx");
    } catch (error) {
        console.error("Erro ao exportar despesas:", error);
        alert("Erro ao exportar despesas. Verifique o console para mais detalhes.");
    }
});

DOM.importDataBtn.addEventListener("click", () => DOM.importDataInput.click());
DOM.importDataInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        const requiredFields = ["Cliente", "Produto", "Quantidade", "Total", "Data", "Pago", "Telefone"];
        const validData = json.filter(item => 
            requiredFields.every(field => item[field] !== undefined && item[field] !== null)
        );

        if (validData.length === 0) {
            alert("Nenhum dado válido encontrado no arquivo. Verifique se o arquivo contém as colunas: " + requiredFields.join(", "));
            return;
        }

        await Promise.all(
            validData.map(item => {
                let formattedDate;
                try {
                    const dateObj = new Date(item.Data);
                    if (isNaN(dateObj.getTime())) {
                        throw new Error("Data inválida");
                    }
                    formattedDate = dateObj.toISOString().split("T")[0];
                } catch (error) {
                    formattedDate = new Date().toISOString().split("T")[0];
                }
                return addDoc(collection(db, "sales"), {
                    nome: item.Cliente || "Desconhecido",
                    produto: item.Produto || "Produto não especificado",
                    qtd: parseInt(item.Quantidade, 10) || 1,
                    total: parseFloat(item.Total) || 0,
                    data: formattedDate,
                    pago: item.Pago === "Sim" || item.Pago === true,
                    telefone: item.Telefone || "N/A",
                    timestamp: new Date(),
                });
            })
        );
        alert("Vendas importadas com sucesso!");
        DOM.importDataInput.value = "";
        await loadSales();
    } catch (error) {
        console.error("Erro ao importar vendas:", error);
        alert("Erro ao importar vendas. Verifique se o arquivo está no formato correto (.xlsx) e contém as colunas esperadas: " + requiredFields.join(", "));
    }
});

DOM.importExpensesBtn.addEventListener("click", () => DOM.importExpensesInput.click());
DOM.importExpensesInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        const requiredFields = ["Categoria", "Descrição", "Valor", "Data"];
        const validData = json.filter(item => 
            requiredFields.every(field => item[field] !== undefined && item[field] !== null)
        );

        if (validData.length === 0) {
            alert("Nenhum dado válido encontrado no arquivo. Verifique se o arquivo contém as colunas: " + requiredFields.join(", "));
            return;
        }

        await Promise.all(
            validData.map(item => {
                let formattedDate;
                try {
                    const dateObj = new Date(item.Data);
                    if (isNaN(dateObj.getTime())) {
                        throw new Error("Data inválida");
                    }
                    formattedDate = dateObj.toISOString().split("T")[0];
                } catch (error) {
                    formattedDate = new Date().toISOString().split("T")[0];
                }
                return addDoc(collection(db, "expenses"), {
                    categoria: item.Categoria || "Outros",
                    descricao: item.Descrição || "Descrição não especificada",
                    valor: parseFloat(item.Valor) || 0,
                    data: formattedDate,
                    timestamp: new Date(),
                });
            })
        );
        alert("Despesas importadas com sucesso!");
        DOM.importExpensesInput.value = "";
        await loadExpenses();
    } catch (error) {
        console.error("Erro ao importar despesas:", error);
        alert("Erro ao importar despesas. Verifique se o arquivo está no formato correto (.xlsx) e contém as colunas esperadas: " + requiredFields.join(", "));
    }
});

function activateTab(tabId) {
    DOM.tabContents.forEach(content => {
        const active = content.id === tabId;
        content.classList.toggle("hidden", !active);
        content.classList.toggle("active", active);
        content.setAttribute("aria-hidden", !active);
        content.tabIndex = active ? 0 : -1;
    });

    DOM.tabs.forEach(tab => {
        const active = tab.dataset.tab === tabId;
        tab.classList.toggle("active", active);
        tab.classList.toggle("bg-gray-700", !active);
        tab.classList.toggle("bg-gray-600", active);
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

DOM.prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderSalesTable();
    }
});

DOM.nextPage.addEventListener("click", () => {
    const filtered = completedSales.filter(s => {
        if (DOM.filterClient.value && !s.nome.toLowerCase().includes(DOM.filterClient.value.toLowerCase())) return false;
        if (DOM.filterProduct.value && !s.produto.toLowerCase().includes(DOM.filterProduct.value.toLowerCase())) return false;
        if (DOM.filterStatus.value && s.pago !== (DOM.filterStatus.value === "pago")) return false;
        if (DOM.filterStart.value && s.data < DOM.filterStart.value) return false;
        if (DOM.filterEnd.value && s.data > DOM.filterEnd.value) return false;
        return true;
    });
    if (currentPage < Math.ceil(filtered.length / itemsPerPage)) {
        currentPage++;
        renderSalesTable();
    }
});

DOM.prevExpensePage.addEventListener("click", () => {
    if (expensePage > 1) {
        expensePage--;
        renderExpenseTable();
    }
});

DOM.nextExpensePage.addEventListener("click", () => {
    const filtered = currentExpenses.filter(e => {
        if (DOM.filterECategoria.value && !e.categoria.toLowerCase().includes(DOM.filterECategoria.value.toLowerCase())) return false;
        if (DOM.filterEDescricao.value && !e.descricao.toLowerCase().includes(DOM.filterEDescricao.value.toLowerCase())) return false;
        if (DOM.filterEStart.value && e.data < DOM.filterEStart.value) return false;
        if (DOM.filterEEnd.value && e.data > DOM.filterEEnd.value) return false;
        return true;
    });
    if (expensePage < Math.ceil(filtered.length / itemsPerPage)) {
        expensePage++;
        renderExpenseTable();
    }
});

const debouncedRenderSales = debounce(renderSalesTable, 300);
const debouncedRenderExpenses = debounce(renderExpenseTable, 300);
const debouncedRenderClientDebts = debounce(groupByClient, 300);

[
    DOM.filterClient,
    DOM.filterStart,
    DOM.filterEnd,
    DOM.filterStatus,
    DOM.filterProduct,
].forEach(input => input.addEventListener("input", debouncedRenderSales));

[
    DOM.filterECategoria,
    DOM.filterEDescricao,
    DOM.filterEStart,
    DOM.filterEEnd,
].forEach(input => input.addEventListener("input", debouncedRenderExpenses));

[DOM.filterStart, DOM.filterEnd].forEach(input => input.addEventListener("input", debouncedRenderClientDebts));

renderProducts();
loadSales();
loadExpenses();
renderCurrentSale();
activateTab("new-sale");