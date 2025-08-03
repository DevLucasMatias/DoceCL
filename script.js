// --- Dados Iniciais ---
const PRODUCTS = [
    { id: 'brigadeiro-tradicional', nome: 'Brigadeiro Tradicional', preco: 2.50, imagem: 'a.jpg' },
    // Adicione mais produtos conforme necessário
];

let currentSale = [];
let completedSales = [];
let isGroupedView = false;

// --- Seletores DOM ---
const DOM = {
    produtosDiv: document.getElementById('produtos'),
    formSale: document.getElementById('form-venda'),
    compradoresTabela: document.getElementById('compradores'),
    vendaAtualDiv: document.getElementById('venda-atual'),
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
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Erro ao salvar dados no localStorage para a chave "${key}":`, error);
    }
}

function loadFromLocalStorage(key, defaultValue = []) {
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
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function exportToJSON() {
    const dataStr = JSON.stringify(completedSales);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendas_brigadeiros.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            completedSales = importedData;
            saveToLocalStorage('compradores', completedSales);
            updateSalesTable();
            alert('Dados importados com sucesso!');
        } catch (error) {
            alert('Erro ao importar dados. Verifique o arquivo.');
            console.error('Erro ao importar JSON:', error);
        }
    };
    reader.readAsText(file);
}

// --- Funções de UI ---
function renderProducts() {
    DOM.produtosDiv.innerHTML = '';
    PRODUCTS.forEach(product => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.setAttribute('data-id', product.id);
        card.innerHTML = `
            <img src="${product.imagem}" alt="${product.nome}" loading="lazy" />
            <h3>${product.nome}</h3>
            <p>R$ ${product.preco.toFixed(2)}</p>
        `;
        card.addEventListener('click', () => handleAddProductToCurrentSale(product));
        DOM.produtosDiv.appendChild(card);
    });
}

function renderCurrentSaleDisplay() {
    if (currentSale.length === 0) {
        DOM.vendaAtualDiv.innerHTML = '<p>Nenhum produto selecionado. Clique nos doces ao lado para adicionar!</p>';
        return;
    }

    DOM.vendaAtualDiv.innerHTML = currentSale.map((p, i) =>
        `<div class="venda-item">
            <span>${p.qtd}x ${p.nome} — R$ ${p.total.toFixed(2)}</span>
            <button class="remover-btn" data-index="${i}" aria-label="Remover ${p.nome}">Remover</button>
        </div>`
    ).join('');

    DOM.vendaAtualDiv.querySelectorAll('.remover-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            handleRemoveProductFromCurrentSale(idx);
        });
    });
}

function updateSalesTable(salesData = completedSales) {
    DOM.compradoresTabela.innerHTML = '';
    if (salesData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="9" style="text-align: center; padding: 20px; color: var(--text-dark);">Nenhuma venda registrada ainda.</td>`;
        DOM.compradoresTabela.appendChild(tr);
        return;
    }

    if (isGroupedView) {
        // Agrupar por cliente
        const groupedSales = {};
        salesData.forEach(sale => {
            if (!groupedSales[sale.nome]) {
                groupedSales[sale.nome] = {
                    telefone: sale.telefone,
                    qtdTotal: 0,
                    total: 0,
                    datas: new Set(),
                    status: sale.pago ? 'Pago' : 'Não Pago',
                    produtos: [],
                };
            }
            groupedSales[sale.nome].qtdTotal += sale.qtd;
            groupedSales[sale.nome].total += sale.total;
            groupedSales[sale.nome].datas.add(sale.data);
            groupedSales[sale.nome].produtos.push(sale.produto);
            if (!sale.pago) groupedSales[sale.nome].status = 'Não Pago';
        });

        Object.entries(groupedSales).forEach(([nome, data]) => {
            const tr = document.createElement('tr');
            if (data.status === 'Não Pago') tr.classList.add('devedor');
            tr.innerHTML = `
                <td>${nome}</td>
                <td>${data.telefone || 'N/A'}</td>
                <td>${data.produtos.join(', ')}</td>
                <td>${data.qtdTotal}</td>
                <td>R$ ${data.total.toFixed(2)}</td>
                <td>${Array.from(data.datas).map(formatDate).join(', ')}</td>
                <td class="${data.status === 'Pago' ? 'status-pago' : 'status-nao-pago'}">${data.status}</td>
                <td>-</td>
                <td>-</td>
            `;
            DOM.compradoresTabela.appendChild(tr);
        });
    } else {
        // Visão detalhada
        salesData.forEach((sale, index) => {
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
                <td>
                    <button class="botao-pagar" data-index="${index}">
                        ${sale.pago ? 'Desmarcar' : 'Marcar Pago'}
                    </button>
                </td>
                <td>
                    <button class="botao-remover-cliente" data-index="${index}" aria-label="Remover cliente ${sale.nome}">Remover</button>
                </td>
            `;
            DOM.compradoresTabela.appendChild(tr);
        });

        DOM.compradoresTabela.querySelectorAll('.botao-pagar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                handleTogglePaymentStatus(idx);
            });
        });

        DOM.compradoresTabela.querySelectorAll('.botao-remover-cliente').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                handleRemoveClient(idx);
            });
        });
    }
}

function activateTab(tabId) {
    DOM.tabs.forEach(b => b.classList.remove('active'));
    DOM.tabContents.forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function showModal() {
    const clientName = DOM.formSale.querySelector('#nome').value.trim();
    const clientPhone = DOM.formSale.querySelector('#telefone').value.trim();
    const saleDate = DOM.formSale.querySelector('#data').value;

    DOM.modalDetalhes.innerHTML = `
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Telefone:</strong> ${clientPhone || 'Não informado'}</p>
        <p><strong>Data:</strong> ${formatDate(saleDate)}</p>
        <p><strong>Produtos:</strong></p>
        <ul>
            ${currentSale.map(item => `<li>${item.qtd}x ${item.nome} - R$ ${item.total.toFixed(2)}</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> R$ ${currentSale.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</p>
    `;
    DOM.modal.classList.add('active');
}

// --- Funções de Lógica de Negócio ---
function handleAddProductToCurrentSale(product) {
    const item = currentSale.find(p => p.id === product.id);
    if (item) {
        item.qtd += 1;
        item.total = item.qtd * item.preco;
    } else {
        currentSale.push({ ...product, qtd: 1, total: product.preco });
    }
    renderCurrentSaleDisplay();
    activateTab('venda');
}

function handleRemoveProductFromCurrentSale(index) {
    if (index > -1) {
        currentSale.splice(index, 1);
    }
    renderCurrentSaleDisplay();
}

function handleFinalizeSale(e) {
    e.preventDefault();

    if (currentSale.length === 0) {
        alert('Por favor, adicione pelo menos um doce à venda.');
        return;
    }

    const clientName = DOM.formSale.querySelector('#nome').value.trim();
    const saleDate = DOM.formSale.querySelector('#data').value;

    if (!clientName || !saleDate) {
        alert('Nome do comprador e data são obrigatórios.');
        return;
    }

    showModal();
}

function handleConfirmSale() {
    const clientName = DOM.formSale.querySelector('#nome').value.trim();
    const clientPhone = DOM.formSale.querySelector('#telefone').value.trim();
    const saleDate = DOM.formSale.querySelector('#data').value;

    currentSale.forEach(item => {
        completedSales.push({
            nome: clientName,
            telefone: clientPhone || 'Não Informado',
            produto: item.nome,
            qtd: item.qtd,
            total: item.total,
            data: saleDate,
            pago: false,
        });
    });

    saveToLocalStorage('compradores', completedSales);
    currentSale = [];
    renderCurrentSaleDisplay();
    DOM.formSale.reset();
    DOM.modal.classList.remove('active');
    activateTab('controle');
    updateSalesTable();
    alert('Venda finalizada com sucesso!');
}

function handleTogglePaymentStatus(index) {
    if (index > -1 && completedSales[index]) {
        completedSales[index].pago = !completedSales[index].pago;
        saveToLocalStorage('compradores', completedSales);
        updateSalesTable();
    }
}

function handleRemoveClient(index) {
    if (index > -1 && completedSales[index]) {
        const confirmRemoval = confirm(`Tem certeza que deseja remover a venda de ${completedSales[index].nome} referente a ${completedSales[index].produto}?`);
        if (confirmRemoval) {
            completedSales.splice(index, 1);
            saveToLocalStorage('compradores', completedSales);
            updateSalesTable();
            alert('Venda removida com sucesso!');
        }
    }
}

function handleApplyFilters() {
    const filters = {
        cliente: DOM.filterClientInput.value,
        dataInicio: DOM.filterDateStartInput.value,
        dataFim: DOM.filterDateEndInput.value,
        status: DOM.filterStatusSelect.value,
        produto: DOM.filterProductInput.value,
    };

    const filteredSales = completedSales.filter(sale => {
        const clientMatch = !filters.cliente || sale.nome.toLowerCase().includes(filters.cliente.toLowerCase());
        const productMatch = !filters.produto || sale.produto.toLowerCase().includes(filters.produto.toLowerCase());
        const statusMatch = !filters.status || (sale.pago ? 'pago' : 'nao-pago') === filters.status;
        const dateStartMatch = !filters.dataInicio || sale.data >= filters.dataInicio;
        const dateEndMatch = !filters.dataFim || sale.data <= filters.dataFim;

        return clientMatch && productMatch && statusMatch && dateStartMatch && dateEndMatch;
    });

    updateSalesTable(filteredSales);
}

function toggleView() {
    isGroupedView = !isGroupedView;
    DOM.toggleViewButton.textContent = isGroupedView ? 'Alternar para Visão Detalhada' : 'Alternar para Visão Agrupada';
    handleApplyFilters();
}

// --- Inicialização e Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    completedSales = loadFromLocalStorage('compradores');
    renderProducts();
    renderCurrentSaleDisplay();
    updateSalesTable();
    activateTab('venda');

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    DOM.inputDate.value = `${yyyy}-${mm}-${dd}`;

    DOM.formSale.addEventListener('submit', handleFinalizeSale);
    DOM.toggleViewButton.addEventListener('click', toggleView);
    DOM.exportDataButton.addEventListener('click', exportToJSON);
    DOM.importDataButton.addEventListener('click', () => DOM.importDataInput.click());
    DOM.importDataInput.addEventListener('change', importFromJSON);
    DOM.confirmarVenda.addEventListener('click', handleConfirmSale);
    DOM.cancelarVenda.addEventListener('click', () => DOM.modal.classList.remove('active'));

    DOM.tabs.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            activateTab(tabId);
            if (tabId === 'controle') {
                updateSalesTable();
            }
        });
    });

    DOM.filterClientInput.addEventListener('input', handleApplyFilters);
    DOM.filterDateStartInput.addEventListener('change', handleApplyFilters);
    DOM.filterDateEndInput.addEventListener('change', handleApplyFilters);
    DOM.filterStatusSelect.addEventListener('change', handleApplyFilters);
    DOM.filterProductInput.addEventListener('input', handleApplyFilters);
}); 
