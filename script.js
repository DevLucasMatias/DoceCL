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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// --- Função de Venda Corrigida ---
async function confirmSale() {
    const { nome, telefone, data } = getFormData();

    try {
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

// --- Aqui continua o restante do seu script normalmente ---
// (renderProducts, renderCurrentSale, updateSalesTable, togglePayment, etc.)
