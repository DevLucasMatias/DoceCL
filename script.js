// --- Dados Iniciais ---
const PRODUCTS = [
    { id: 'brigadeiro-tradicional', nome: 'Brigadeiro Tradicional', preco: 2.50, imagem: 'Brigadeiro.jpg' },
    // { id: 'brigadeiro-chocolate', nome: 'Brigadeiro de Chocolate', preco: 2.80, imagem: 'brigadeiro-chocolate.jpg' },
    // { id: 'brigadeiro-leite-ninho', nome: 'Brigadeiro Leite Ninho', preco: 3.00, imagem: 'brigadeiro-leite-ninho.jpg' },
];

let currentSale = [];
let completedSales = [];
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
    inputDate: document.getElementById('data'),
};

// --- Funções de Utilitário ---
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Erro ao salvar dados no localStorage para a chave "${key}":`, error);
    }
}

function loadData(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Erro ao carregar dados do localStorage para a chave "${key}":`, error);
        return defaultValue;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function exportData() {
    const dataStr = JSON.stringify(completedSales, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_brigadeiros_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Dados exportados com sucesso!');
}

function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData)) throw new Error('Formato inválido');
                completedSales = importedData;
                saveData('sales', completedSales);
                updateSalesTable();
                alert('Dados importados com sucesso!');
            } catch (error) {
                alert('Erro ao importar dados. Verifique o arquivo.');
                console.error('Erro ao importar JSON:', error);
            }
        };
        reader.readAsText(file);
    }
}

// --- Funções de UI ---
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

function activateTab(tabId) {
    DOM.tabs.forEach(t => t.classList.remove('active'));
    DOM.tabContents.forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    if (tabId === 'sales-history') updateSalesTable();
}

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

// --- Funções de Lógica ---
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

function confirmSale() {
    const { nome, telefone, data } = getFormData();
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
    alert('Venda registrada com sucesso!');
}

function togglePayment(index) {
    if (completedSales[index]) {
        completedSales[index].pago = !completedSales[index].pago;
        saveData('sales', completedSales);
        updateSalesTable();
    }
}

function removeSale(index) {
    if (completedSales[index] && confirm(`Remover venda de ${completedSales[index].nome}?`)) {
        completedSales.splice(index, 1);
        saveData('sales', completedSales);
        updateSalesTable();
    }
}

function applyFilters() {
    const filters = {
        cliente: DOM.filterClientInput.value.toLowerCase(),
        dataInicio: DOM.filterDateStartInput.value,
        dataFim: DOM.filterDateEndInput.value,
        status: DOM.filterStatusSelect.value,
        produto: DOM.filterProductInput.value.toLowerCase()
    };
    const filtered = completedSales.filter(sale => 
        (!filters.cliente || sale.nome.toLowerCase().includes(filters.cliente)) &&
        (!filters.dataInicio || sale.data >= filters.dataInicio) &&
        (!filters.dataFim || sale.data <= filters.dataFim) &&
        (!filters.status || (sale.pago ? 'pago' : 'nao-pago') === filters.status) &&
        (!filters.produto || sale.produto.toLowerCase().includes(filters.produto))
    );
    updateSalesTable(filtered);
}

function toggleView() {
    isGroupedView = !isGroupedView;
    DOM.toggleViewButton.textContent = isGroupedView ? 'Visão Agrupada' : 'Visão Detalhada';
    applyFilters();
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    completedSales = loadData('sales');
    renderProducts();
    renderCurrentSale();
    activateTab('new-sale');
    const today = new Date();
    DOM.inputDate.value = today.toISOString().split('T')[0];

    DOM.formSale.addEventListener('submit', handleSale);
    DOM.confirmarVenda.addEventListener('click', confirmSale);
    DOM.cancelarVenda.addEventListener('click', () => DOM.modal.classList.remove('active'));

    DOM.tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));

    DOM.toggleViewButton.addEventListener('click', toggleView);

    DOM.exportDataButton.addEventListener('click', exportData);

    DOM.importDataButton.addEventListener('click', () => DOM.importDataInput.click());
    DOM.importDataInput.addEventListener('change', importData);

    [ 'filterClientInput', 'filterDateStartInput', 'filterDateEndInput', 'filterStatusSelect', 'filterProductInput' ].forEach(id =>
        DOM[id].addEventListener('input', applyFilters)
    );
});
