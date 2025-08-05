// --- Firebase Config e Inicialização ---
const firebaseConfig = {
  apiKey: "AIzaSyCFGN-HlN620RFrFAw2ty-KU4gRWrWXtIE",
  authDomain: "brigadeirospainel.firebaseapp.com",
  projectId: "brigadeirospainel",
  storageBucket: "brigadeirospainel.firebasestorage.app",
  messagingSenderId: "786298308276",
  appId: "1:786298308276:web:a548c7b7e604c4d88b79e1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Dados Iniciais ---
const PRODUCTS = [
    { id: 'brigadeiro-tradicional', nome: 'Brigadeiro Tradicional', preco: 2.50, imagem: 'Brigadeiro.jpg' },
    // Adicione outros produtos aqui se quiser
];

let currentSale = [];
let completedSales = [];
let currentExpenses = [];
let isGroupedView = false;

// --- Seletores DOM ---
const DOM = {
    produtosDiv: document.getElementById('produtos'),
    formSale: document.getElementById('form-venda'),
    vendaAtualDiv: document.getElementById('venda-atual'),
    compradoresDiv: document.getElementById('compradores'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    filterClientInput: document.getElementById('filtro-cliente'),
    filterDateStartInput: document.getElementById('filtro-data-inicio'),
    filterDateEndInput: document.getElementById('filtro-data-fim'),
    filterStatusSelect: document.getElementById('filtro-status'),
    filterProductInput: document.getElementById('filtro-produto'),
    toggleViewButton: document.getElementById('toggle-view'),
    exportDataButton: document.getElementById('export-data'),
    importDataButton: document.getElementById('import-data-btn'),
    importDataInput: document.getElementById('import-data'),
    modal: document.getElementById('modal-confirmacao'),
    modalDetalhes: document.getElementById('modal-venda-detalhes'),
    confirmarVenda: document.getElementById('confirmar-venda'),
    cancelarVenda: document.getElementById('cancelar-venda'),

    // Despesas
    formExpense: document.getElementById('form-despesa'),
    despesasDiv: document.getElementById('despesas'),
    filterExpenseCategory: document.getElementById('filtro-despesa-categoria'),
    filterExpenseDateStart: document.getElementById('filtro-despesa-data-inicio'),
    filterExpenseDateEnd: document.getElementById('filtro-despesa-data-fim'),
    filterExpenseDescription: document.getElementById('filtro-despesa-descricao'),
    exportExpensesBtn: document.getElementById('export-expenses'),
    importExpensesBtn: document.getElementById('import-expenses-btn'),
    importExpensesInput: document.getElementById('import-expenses'),
    modalExpenseConfirm: document.getElementById('modal-confirmacao-despesa'),
    modalExpenseDetails: document.getElementById('modal-despesa-detalhes'),
    confirmarDespesa: document.getElementById('confirmar-despesa'),
    cancelarDespesa: document.getElementById('cancelar-despesa'),
};

// --- Utilitários ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// --- Renderização ---
function renderProducts() {
    DOM.produtosDiv.innerHTML = PRODUCTS.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.imagem}" alt="${product.nome}" loading="lazy" />
            <h3>${product.nome}</h3>
            <p>R$ ${product.preco.toFixed(2)}</p>
        </div>
    `).join('');
    document.querySelectorAll('.product-card').forEach(card =>
        card.addEventListener('click', () => addToSale(PRODUCTS.find(p => p.id === card.dataset.id)))
    );
}

function renderCurrentSale() {
    if (!currentSale.length) {
        DOM.vendaAtualDiv.innerHTML = '<p>Nenhum produto selecionado. Adicione itens!</p>';
        return;
    }
    DOM.vendaAtualDiv.innerHTML = currentSale.map((item, i) => `
        <div class="order-item">
            <span>${item.qtd}x ${item.nome} - R$ ${item.total.toFixed(2)}</span>
            <button class="remover-btn" data-index="${i}" aria-label="Remover ${item.nome}">Remover</button>
        </div>
    `).join('');
    document.querySelectorAll('.remover-btn').forEach(btn =>
        btn.addEventListener('click', () => removeFromSale(parseInt(btn.dataset.index)))
    );
}

function updateSalesTable(sales = completedSales) {
    DOM.compradoresDiv.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Total</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ações</th>
                    <th>Remover</th>
                </tr>
            </thead>
            <tbody id="sales-body"></tbody>
        </table>
    `;
    const tbody = document.getElementById('sales-body');
    if (!sales.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Nenhuma venda registrada.</td></tr>';
        return;
    }

    if (isGroupedView) {
        const grouped = {};
        sales.forEach(sale => {
            const key = sale.nome + (sale.telefone || '');
            if (!grouped[key]) {
                grouped[key] = { telefone: sale.telefone || 'N/A', qtdTotal: 0, total: 0, datas: new Set(), status: sale.pago, produtos: [] };
            }
            grouped[key].qtdTotal += sale.qtd;
            grouped[key].total += sale.total;
            grouped[key].datas.add(sale.data);
            grouped[key].produtos.push(sale.produto);
            if (!sale.pago) grouped[key].status = false;
        });

        Object.values(grouped).forEach(data => {
            const tr = document.createElement('tr');
            if (!data.status) tr.classList.add('devedor');
            tr.innerHTML = `
                <td>${data.produtos[0].split(',')[0]}</td>
                <td>${data.telefone}</td>
                <td>${data.produtos.join(', ')}</td>
                <td>${data.qtdTotal}</td>
                <td>R$ ${data.total.toFixed(2)}</td>
                <td>${Array.from(data.datas).map(formatDate).join(', ')}</td>
                <td class="${data.status ? 'status-pago' : 'status-nao-pago'}">${data.status ? 'Pago' : 'Não Pago'}</td>
                <td>-</td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        sales.forEach((sale, i) => {
            const tr = document.createElement('tr');
            if (!sale.pago) tr.classList.add('devedor');
            tr.innerHTML = `
                <td>${sale.nome}</td>
                <td>${sale.telefone || 'N/A'}</td>
                <td>${sale.produto}</td>
                <td>${sale.qtd}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
                <td>${formatDate(sale.data)}</td>
                <td class="${sale.pago ? 'status-pago' : 'status-nao-pago'}">${sale.pago ? 'Pago' : 'Não Pago'}</td>
                <td><button class="pay-btn" data-index="${i}">${sale.pago ? 'Desmarcar' : 'Pagar'}</button></td>
                <td><button class="remove-btn" data-index="${i}">Remover</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.pay-btn').forEach(btn =>
            btn.addEventListener('click', () => togglePayment(parseInt(btn.dataset.index)))
        );
        document.querySelectorAll('.remove-btn').forEach(btn =>
            btn.addEventListener('click', () => removeSale(parseInt(btn.dataset.index)))
        );
    }
}

// --- Modal Vendas ---
function showModal() {
    const { nome, telefone, data } = getFormData();
    DOM.modalDetalhes.innerHTML = `
        <p><strong>Cliente:</strong> ${nome}</p>
        <p><strong>Telefone:</strong> ${telefone || 'N/A'}</p>
        <p><strong>Data:</strong> ${formatDate(data)}</p>
        <p><strong>Itens:</strong></p>
        <ul>${currentSale.map(item => `<li>${item.qtd}x ${item.nome} - R$ ${item.total.toFixed(2)}</li>`).join('')}</ul>
        <p><strong>Total:</strong> R$ ${currentSale.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</p>
    `;
    DOM.modal.classList.add('active');
}

// --- Lógica Venda ---
function addToSale(product) {
    let item = currentSale.find(p => p.id === product.id);
    if (item) {
        item.qtd++;
        item.total = item.qtd * item.preco;
    } else {
        currentSale.push({ ...product, qtd: 1, total: product.preco });
    }
    renderCurrentSale();
    activateTab('new-sale');
}

function removeFromSale(index) {
    currentSale.splice(index, 1);
    renderCurrentSale();
}

function getFormData() {
    return {
        nome: DOM.formSale.querySelector('#nome').value.trim(),
        telefone: DOM.formSale.querySelector('#telefone').value.trim(),
        data: DOM.formSale.querySelector('#data').value
    };
}

function handleSale(e) {
    e.preventDefault();
    if (!currentSale.length) {
        alert('Adicione pelo menos um produto!');
        return;
    }
    const { nome, data } = getFormData();
    if (!nome || !data) {
        alert('Nome e data são obrigatórios!');
        return;
    }
    showModal();
}



function cancelSale() {
    DOM.modal.classList.remove('active');
}

// --- Funções Histórico ---
async function loadSales() {
    try {
        const snapshot = await db.collection("vendas").orderBy('timestamp', 'desc').get();
        completedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applySalesFilters();
    } catch (error) {
        alert("Erro ao carregar vendas: " + error.message);
    }
}

async function confirmSale() {
    const { nome, telefone, data } = getFormData();
    
    try {
        // Salvar cada item da venda no Firestore
        for (const item of currentSale) {
            await db.collection('sales').add({
                nome,
                telefone: telefone || 'N/A',
                produto: item.nome,
                qtd: item.qtd,
                total: item.total,
                data,
                pago: false
            });
        }

        // Também salvar localmente (localStorage)
        currentSale.forEach(item => {
            completedSales.push({
                nome,
                telefone: telefone || 'N/A',
                produto: item.nome,
                qtd: item.qtd,
                total: item.total,
                data,
                pago: false
            });
        });
        saveData('sales', completedSales);

        currentSale = [];
        renderCurrentSale();
        DOM.formSale.reset();
        DOM.modal.classList.remove('active');
        activateTab('sales-history');
        updateSalesTable();

        alert('Venda registrada e salva no Firebase com sucesso!');
    } catch (error) {
        alert('Erro ao salvar a venda no Firebase. Confira o console.');
        console.error('Erro ao salvar no Firebase:', error);
    }
}


function applySalesFilters() {
    let filtered = completedSales;

    const nomeFiltro = DOM.filterClientInput.value.toLowerCase();
    const dataInicio = DOM.filterDateStartInput.value;
    const dataFim = DOM.filterDateEndInput.value;
    const statusFiltro = DOM.filterStatusSelect.value;
    const produtoFiltro = DOM.filterProductInput.value.toLowerCase();

    if (nomeFiltro) filtered = filtered.filter(s => s.nome.toLowerCase().includes(nomeFiltro));
    if (produtoFiltro) filtered = filtered.filter(s => s.produto.toLowerCase().includes(produtoFiltro));
    if (dataInicio) filtered = filtered.filter(s => s.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(s => s.data <= dataFim);
    if (statusFiltro) {
        const pagoStatus = statusFiltro === 'pago';
        filtered = filtered.filter(s => s.pago === pagoStatus);
    }

    updateSalesTable(filtered);
}

async function togglePayment(index) {
    const sale = completedSales[index];
    try {
        await db.collection("vendas").doc(sale.id).update({ pago: !sale.pago });
        loadSales();
    } catch (error) {
        alert("Erro ao atualizar status: " + error.message);
    }
}

async function removeSale(index) {
    const sale = completedSales[index];
    if (!confirm(`Remover a venda do cliente ${sale.nome}?`)) return;
    try {
        await db.collection("vendas").doc(sale.id).delete();
        loadSales();
    } catch (error) {
        alert("Erro ao remover venda: " + error.message);
    }
}

// --- Funções Despesas ---
async function loadExpenses() {
    try {
        const snapshot = await db.collection("despesas").orderBy('timestamp', 'desc').get();
        currentExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyExpenseFilters();
        renderExpenseChart();
    } catch (error) {
        alert("Erro ao carregar despesas: " + error.message);
    }
}

function applyExpenseFilters() {
    let filtered = currentExpenses;

    const catFiltro = DOM.filterExpenseCategory.value.toLowerCase();
    const descFiltro = DOM.filterExpenseDescription.value.toLowerCase();
    const dataInicio = DOM.filterExpenseDateStart.value;
    const dataFim = DOM.filterExpenseDateEnd.value;

    if (catFiltro) filtered = filtered.filter(d => d.categoria.toLowerCase().includes(catFiltro));
    if (descFiltro) filtered = filtered.filter(d => d.descricao.toLowerCase().includes(descFiltro));
    if (dataInicio) filtered = filtered.filter(d => d.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(d => d.data <= dataFim);

    updateExpenseTable(filtered);
}

function updateExpenseTable(expenses = currentExpenses) {
    DOM.despesasDiv.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Valor (R$)</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="expenses-body"></tbody>
        </table>
    `;
    const tbody = document.getElementById('expenses-body');
    if (!expenses.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhuma despesa registrada.</td></tr>';
        return;
    }
    expenses.forEach((expense, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${expense.categoria}</td>
            <td>${expense.descricao}</td>
            <td>R$ ${parseFloat(expense.valor).toFixed(2)}</td>
            <td>${formatDate(expense.data)}</td>
            <td><button class="remove-expense-btn" data-index="${i}">Remover</button></td>
        `;
        tbody.appendChild(tr);
    });
    document.querySelectorAll('.remove-expense-btn').forEach(btn =>
        btn.addEventListener('click', e => removeExpense(parseInt(e.target.dataset.index)))
    );
}

function showModalExpense() {
    const categoria = DOM.formExpense.querySelector('#categoria-despesa').value;
    const descricao = DOM.formExpense.querySelector('#descricao-despesa').value.trim();
    const valor = DOM.formExpense.querySelector('#valor-despesa').value;
    const data = DOM.formExpense.querySelector('#data-despesa').value;

    DOM.modalExpenseDetails.innerHTML = `
        <p><strong>Categoria:</strong> ${categoria}</p>
        <p><strong>Descrição:</strong> ${descricao}</p>
        <p><strong>Valor:</strong> R$ ${parseFloat(valor).toFixed(2)}</p>
        <p><strong>Data:</strong> ${formatDate(data)}</p>
    `;
    DOM.modalExpenseConfirm.classList.add('active');
}

async function confirmExpense() {
    const categoria = DOM.formExpense.querySelector('#categoria-despesa').value;
    const descricao = DOM.formExpense.querySelector('#descricao-despesa').value.trim();
    const valor = DOM.formExpense.querySelector('#valor-despesa').value;
    const data = DOM.formExpense.querySelector('#data-despesa').value;

    if (!categoria || !descricao || !valor || !data) {
        alert('Preencha todos os campos da despesa!');
        return;
    }
    try {
        await db.collection("despesas").add({
            categoria,
            descricao,
            valor: parseFloat(valor),
            data,
            timestamp: new Date()
        });
        alert("Despesa registrada com sucesso!");
        DOM.formExpense.reset();
        DOM.modalExpenseConfirm.classList.remove('active');
        loadExpenses();
        activateTab('expenses');
    } catch (error) {
        alert("Erro ao salvar despesa: " + error.message);
    }
}

function cancelExpense() {
    DOM.modalExpenseConfirm.classList.remove('active');
}

async function removeExpense(index) {
    const expense = currentExpenses[index];
    if (!confirm(`Remover despesa: ${expense.descricao}?`)) return;
    try {
        await db.collection("despesas").doc(expense.id).delete();
        loadExpenses();
    } catch (error) {
        alert("Erro ao remover despesa: " + error.message);
    }
}

// --- Chart de despesas ---
let expenseChart;
function renderExpenseChart() {
    const grouped = {};
    currentExpenses.forEach(exp => {
        grouped[exp.categoria] = (grouped[exp.categoria] || 0) + exp.valor;
    });

    const ctx = document.getElementById('expense-chart').getContext('2d');
    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: 'Despesas',
                data: Object.values(grouped),
                backgroundColor: ['#f39c12', '#e74c3c', '#8e44ad', '#3498db', '#2ecc71'],
                hoverOffset: 30
            }]
        }
    });
}

// --- Controle abas ---
function activateTab(tabId) {
    DOM.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabId));
    DOM.tabContents.forEach(section => section.classList.toggle('active', section.id === tabId));
}

// --- Eventos ---
DOM.tabs.forEach(tab =>
    tab.addEventListener('click', () => activateTab(tab.dataset.tab))
);

DOM.formSale.addEventListener('submit', handleSale);
DOM.confirmarVenda.addEventListener('click', confirmSale);
DOM.cancelarVenda.addEventListener('click', cancelSale);

DOM.filterClientInput.addEventListener('input', applySalesFilters);
DOM.filterDateStartInput.addEventListener('change', applySalesFilters);
DOM.filterDateEndInput.addEventListener('change', applySalesFilters);
DOM.filterStatusSelect.addEventListener('change', applySalesFilters);
DOM.filterProductInput.addEventListener('input', applySalesFilters);

DOM.toggleViewButton.addEventListener('click', () => {
    isGroupedView = !isGroupedView;
    applySalesFilters();
});

DOM.exportDataButton.addEventListener('click', () => {
    if (!completedSales.length) {
        alert('Nenhuma venda para exportar.');
        return;
    }
    const dataStr = JSON.stringify(completedSales, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

DOM.importDataButton.addEventListener('click', () => DOM.importDataInput.click());
DOM.importDataInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('Arquivo inválido.');
            for (const item of imported) {
                await db.collection('vendas').add(item);
            }
            alert('Vendas importadas com sucesso!');
            loadSales();
        } catch (error) {
            alert('Erro ao importar: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Despesas eventos
DOM.formExpense.addEventListener('submit', e => {
    e.preventDefault();
    showModalExpense();
});
DOM.confirmarDespesa.addEventListener('click', confirmExpense);
DOM.cancelarDespesa.addEventListener('click', cancelExpense);

DOM.filterExpenseCategory.addEventListener('input', applyExpenseFilters);
DOM.filterExpenseDateStart.addEventListener('change', applyExpenseFilters);
DOM.filterExpenseDateEnd.addEventListener('change', applyExpenseFilters);
DOM.filterExpenseDescription.addEventListener('input', applyExpenseFilters);

DOM.exportExpensesBtn.addEventListener('click', () => {
    if (!currentExpenses.length) {
        alert('Nenhuma despesa para exportar.');
        return;
    }
    const dataStr = JSON.stringify(currentExpenses, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

DOM.importExpensesBtn.addEventListener('click', () => DOM.importExpensesInput.click());
DOM.importExpensesInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('Arquivo inválido.');
            for (const item of imported) {
                await db.collection('despesas').add(item);
            }
            alert('Despesas importadas com sucesso!');
            loadExpenses();
        } catch (error) {
            alert('Erro ao importar: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Inicialização
renderProducts();
renderCurrentSale();
loadSales();
loadExpenses();
activateTab('new-sale');
