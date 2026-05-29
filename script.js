/* ═══════════════════════════════════════════════════════════════
   DoceCL — script.js
   Integração Firebase Firestore + todas as features originais
   + design premium, login, exportação Excel (SheetJS), debounce,
     timezone fix, gráfico refinado, agrupamento avançado
   + botão "Copiar Mensagem" na aba de Dívidas por Cliente
   ═══════════════════════════════════════════════════════════════ */

   import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
   import { getFirestore, collection, addDoc, getDocs,
            updateDoc, doc, deleteDoc, query, orderBy,
            onSnapshot }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
   
   // ──────────────────────────────────────────────────────────────
   // 1. CONFIGURAÇÃO FIREBASE
   // ──────────────────────────────────────────────────────────────
   const firebaseConfig = {
     apiKey:            "AIzaSyCFGN-HlN620RFrFAw2ty-KU4gRWrWXtIE",
     authDomain:        "brigadeirospainel.firebaseapp.com",
     projectId:         "brigadeirospainel",
     storageBucket:     "brigadeirospainel.appspot.com",
     messagingSenderId: "786298308276",
     appId:             "1:786298308276:web:a548c7b7e604c4d88b79e1",
   };
   
   const app = initializeApp(firebaseConfig);
   const db  = getFirestore(app);
   
   // ──────────────────────────────────────────────────────────────
   // 2. USUÁRIOS DO SISTEMA (login local)
   // ──────────────────────────────────────────────────────────────
   const USERS = {
     lucas:  { pass: "docecl123", name: "Lucas",  initials: "LC" },
     cleice: { pass: "docecl123", name: "Cleice", initials: "CL" },
     admin:  { pass: "admin123",  name: "Admin",  initials: "AD" },
   };
   
   // ──────────────────────────────────────────────────────────────
   // 3. CATÁLOGO DE PRODUTOS
   // ──────────────────────────────────────────────────────────────
   const PRODUCTS = [
     { id: "Brigadeiro",   nome: "Brigadeiro Tradicional", preco: 3.00,  emoji: "🍫", imagem: "briga.jpg"       },
     { id: "kit12",        nome: "Kit com 12 unidades",    preco: 38.00, emoji: "📦", imagem: "2.jpg"           },
     { id: "kit24",        nome: "Kit com 24 unidades",    preco: 74.00, emoji: "🎁", imagem: "2.jpg"           },
     { id: "Pudim",        nome: "Pudim Tradicional",      preco: 6.00,  emoji: "🍮", imagem: "pudim.jpg.avif"  },
     { id: "Brownie",      nome: "Brownie de Colher",      preco: 7.00,  emoji: "🟫", imagem: "brownie.jpg"     },
   ];
   
   // ──────────────────────────────────────────────────────────────
   // 4. ESTADO DA APLICAÇÃO
   // ──────────────────────────────────────────────────────────────
   let currentSale     = [];
   let completedSales  = [];
   let currentExpenses = [];
   let currentPage     = 1;
   let expensePage     = 1;
   const itemsPerPage  = 10;
   let expenseChart    = null;
   let prodChart       = null;
   let unsubSales      = null;
   let unsubExpenses   = null;
   let currentUser     = null;
   
   // ──────────────────────────────────────────────────────────────
   // 5. UTILITÁRIOS
   // ──────────────────────────────────────────────────────────────
   function debounce(fn, ms) {
     let t;
     return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
   }
   
   function toLocalISODate(dateInput) {
     const d = new Date(dateInput + "T12:00:00");
     return [
       d.getFullYear(),
       String(d.getMonth() + 1).padStart(2, "0"),
       String(d.getDate()).padStart(2, "0"),
     ].join("-");
   }
   
   function fmtDate(s) {
     if (!s) return "—";
     const [y, m, d] = s.split("-");
     return `${d}/${m}/${y}`;
   }
   
   function fmtBRL(v) {
     return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
   }
   
   function toast(msg, type = "success") {
     const t = document.getElementById("toast");
     t.textContent = msg;
     t.className   = "toast show " + type;
     setTimeout(() => t.classList.remove("show"), 3200);
   }
   
   function openModal(id)  { document.getElementById(id)?.classList.add("open");    }
   function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }
   
   // ──────────────────────────────────────────────────────────────
   // 6. LOGIN / LOGOUT
   // ──────────────────────────────────────────────────────────────
   function doLogin() {
     const u   = document.getElementById("login-user").value.trim().toLowerCase();
     const p   = document.getElementById("login-pass").value;
     const err = document.getElementById("login-error");
   
     if (USERS[u] && USERS[u].pass === p) {
       err.style.display = "none";
       currentUser = { ...USERS[u], key: u };
   
       document.getElementById("user-avatar").textContent       = USERS[u].initials;
       document.getElementById("user-name-display").textContent = USERS[u].name;
       document.getElementById("welcome-name").textContent      = USERS[u].name;
   
       document.getElementById("login-screen").classList.add("hide");
       document.getElementById("app").classList.add("visible");
   
       setTimeout(initApp, 600);
     } else {
       err.style.display = "block";
       document.getElementById("login-pass").value = "";
       document.getElementById("login-pass").focus();
     }
   }
   
   function doLogout() {
     if (unsubSales)    unsubSales();
     if (unsubExpenses) unsubExpenses();
     currentUser = null;
     document.getElementById("login-screen").classList.remove("hide");
     document.getElementById("app").classList.remove("visible");
     document.getElementById("login-user").value = "";
     document.getElementById("login-pass").value = "";
   }
   
   document.getElementById("login-pass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
   document.getElementById("login-user").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("login-pass").focus(); });
   
   // ──────────────────────────────────────────────────────────────
   // 7. INICIALIZAÇÃO
   // ──────────────────────────────────────────────────────────────
   function initApp() {
     setTodayDate();
   
     document.getElementById("date-badge").textContent = new Date().toLocaleDateString("pt-BR", {
       weekday: "long", day: "numeric", month: "long",
     });
   
     renderProducts();
     renderCurrentSale();
     startRealtimeListeners();
   }
   
   function setTodayDate() {
     const today = new Date().toISOString().split("T")[0];
     const fv    = document.getElementById("data");
     const fd    = document.getElementById("data-despesa");
     if (fv && !fv.value) fv.value = today;
     if (fd && !fd.value) fd.value = today;
   }
   
   // ──────────────────────────────────────────────────────────────
   // 8. FIREBASE — LISTENERS EM TEMPO REAL
   // ──────────────────────────────────────────────────────────────
   function startRealtimeListeners() {
     const qSales = query(collection(db, "sales"), orderBy("timestamp", "desc"));
     unsubSales = onSnapshot(qSales, snap => {
       completedSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       currentPage = 1;
       refreshAll();
     }, err => console.error("Erro listener vendas:", err));
   
     const qExp = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
     unsubExpenses = onSnapshot(qExp, snap => {
       currentExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       expensePage = 1;
       renderExpenseTable();
       renderExpenseChart();
       updateFinanceSummary();
     }, err => console.error("Erro listener despesas:", err));
   }
   
   function refreshAll() {
     renderSalesTable();
     groupByClient();
     updateFinanceSummary();
     renderDashboardCharts();
     renderDashboardRecentes();
   }
   
   // ──────────────────────────────────────────────────────────────
   // 9. NAVEGAÇÃO
   // ──────────────────────────────────────────────────────────────
   function showPage(id, btn) {
     document.querySelectorAll(".content").forEach(c => c.classList.remove("active"));
     document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
   
     const pg = document.getElementById("page-" + id);
     if (pg) { pg.classList.add("active"); pg.classList.add("fade-in"); }
     if (btn) btn.classList.add("active");
   
     const titles = {
       "dashboard":  "Dashboard",
       "nova-venda": "Nova Venda",
       "historico":  "Histórico de Vendas",
       "dividas":    "Dívidas",
       "despesas":   "Despesas",
     };
     document.getElementById("page-title").textContent = titles[id] || id;
   
     if (id === "nova-venda") setTodayDate();
     if (id === "dashboard")  { renderDashboardCharts(); renderDashboardRecentes(); }
   }
   
   // ──────────────────────────────────────────────────────────────
   // 10. CATÁLOGO DE PRODUTOS
   // ──────────────────────────────────────────────────────────────
   function renderProducts() {
     const grid = document.getElementById("produtos-grid");
     if (!grid) return;
     grid.innerHTML = PRODUCTS.map(p => `
       <div class="produto-card" id="pc-${p.id}" onclick="addProductDirectly('${p.id}')">
         ${p.imagem
           ? `<img src="${p.imagem}" alt="${p.nome}" class="produto-img"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
              <div class="produto-emoji-fallback" style="display:none">${p.emoji}</div>`
           : `<div class="produto-emoji-fallback">${p.emoji}</div>`
         }
         <div class="produto-info">
           <div class="produto-nome">${p.nome}</div>
           <div class="produto-preco">${fmtBRL(p.preco)}</div>
           <button class="produto-add-btn" onclick="event.stopPropagation();addProductDirectly('${p.id}')">
             Adicionar
           </button>
         </div>
       </div>`
     ).join("");
   }
   
   function addProductDirectly(id) {
     const prod = PRODUCTS.find(p => p.id === id);
     if (!prod) return;
     const item = currentSale.find(i => i.id === id);
     if (item) item.qtd++;
     else currentSale.push({ ...prod, qtd: 1 });
     document.getElementById("pc-" + id)?.classList.add("selected");
     renderCurrentSale();
   }
   
   // ──────────────────────────────────────────────────────────────
   // 11. CARRINHO
   // ──────────────────────────────────────────────────────────────
   function renderCurrentSale() {
     const div = document.getElementById("carrinho");
     if (!div) return;
   
     if (!currentSale.length) {
       div.innerHTML = `<div class="carrinho-vazio">Nenhum item adicionado ainda...</div>`;
       return;
     }
   
     const total = currentSale.reduce((s, i) => s + i.qtd * i.preco, 0);
     div.innerHTML = currentSale.map((item, idx) => `
       <div class="carrinho-item">
         <span>${item.emoji} ${item.nome}</span>
         <div style="display:flex;align-items:center;gap:10px">
           <div class="qty-ctrl">
             <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button>
             <span class="qty-num">${item.qtd}</span>
             <button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
           </div>
           <span style="min-width:70px;text-align:right;color:var(--caramel);font-weight:500">
             ${fmtBRL(item.qtd * item.preco)}
           </span>
           <button class="btn btn-danger btn-sm" style="padding:4px 8px" onclick="removeItem(${idx})">✕</button>
         </div>
       </div>`
     ).join("") + `
       <div class="carrinho-total">
         <span>Total</span>
         <span>${fmtBRL(total)}</span>
       </div>`;
   }
   
   function changeQty(idx, delta) {
     currentSale[idx].qtd += delta;
     if (currentSale[idx].qtd <= 0) {
       const id = currentSale[idx].id;
       currentSale.splice(idx, 1);
       if (!currentSale.find(i => i.id === id))
         document.getElementById("pc-" + id)?.classList.remove("selected");
     }
     renderCurrentSale();
   }
   
   function removeItem(idx) {
     const id = currentSale[idx].id;
     currentSale.splice(idx, 1);
     if (!currentSale.find(i => i.id === id))
       document.getElementById("pc-" + id)?.classList.remove("selected");
     renderCurrentSale();
   }
   
   function limparCarrinho() {
     currentSale = [];
     document.querySelectorAll(".produto-card").forEach(c => c.classList.remove("selected"));
     renderCurrentSale();
   }
   
   // ──────────────────────────────────────────────────────────────
   // 12. REGISTRO DE VENDA
   // ──────────────────────────────────────────────────────────────
   document.getElementById("form-venda")?.addEventListener("submit", async e => {
     e.preventDefault();
     if (!currentSale.length) { toast("Adicione pelo menos um item!", "error"); return; }
   
     const nome      = document.getElementById("nome").value.trim();
     const telefone  = document.getElementById("telefone").value.trim() || "N/A";
     const data      = document.getElementById("data").value;
     const pagamento = document.getElementById("pagamento")?.value || "Pix";
     if (!nome || !data) { toast("Preencha nome e data!", "error"); return; }
   
     const formattedDate = toLocalISODate(data);
     const total         = currentSale.reduce((s, i) => s + i.qtd * i.preco, 0);
   
     document.getElementById("modal-venda-detalhes").innerHTML = `
       <div class="modal-row"><span>👤 Cliente</span><span>${nome}</span></div>
       <div class="modal-row"><span>📱 Telefone</span><span>${telefone}</span></div>
       <div class="modal-row"><span>📅 Data</span><span>${fmtDate(formattedDate)}</span></div>
       <div class="modal-row"><span>💳 Pagamento</span><span>${pagamento}</span></div>
       ${currentSale.map(i =>
         `<div class="modal-row"><span>${i.emoji} ${i.nome} × ${i.qtd}</span><span>${fmtBRL(i.qtd * i.preco)}</span></div>`
       ).join("")}
       <div class="modal-row"><span>Total</span><span>${fmtBRL(total)}</span></div>`;
   
     openModal("modal-confirmacao");
   
     document.getElementById("confirmar-venda").onclick = async () => {
       try {
         await Promise.all(currentSale.map(item =>
           addDoc(collection(db, "sales"), {
             nome, telefone, pagamento,
             produto:   item.nome,
             emoji:     item.emoji,
             qtd:       item.qtd,
             total:     item.qtd * item.preco,
             data:      formattedDate,
             pago:      pagamento !== "Fiado",
             timestamp: new Date(),
           })
         ));
   
         toast("Venda registrada! 🎉", "success");
         currentSale = [];
         document.getElementById("form-venda").reset();
         setTodayDate();
         renderCurrentSale();
         document.querySelectorAll(".produto-card").forEach(c => c.classList.remove("selected"));
         closeModal("modal-confirmacao");
       } catch (err) {
         console.error(err);
         toast("Erro ao salvar venda.", "error");
       }
     };
   
     document.getElementById("cancelar-venda").onclick = () => closeModal("modal-confirmacao");
   });
   
   // ──────────────────────────────────────────────────────────────
   // 13. HISTÓRICO DE VENDAS
   // ──────────────────────────────────────────────────────────────
   function getFilteredSales() {
     const fc = document.getElementById("filtro-cliente")?.value.toLowerCase()   || "";
     const fi = document.getElementById("filtro-data-inicio")?.value             || "";
     const ff = document.getElementById("filtro-data-fim")?.value                || "";
     const fs = document.getElementById("filtro-status")?.value                  || "";
     const fp = document.getElementById("filtro-produto")?.value.toLowerCase()   || "";
   
     return completedSales.filter(s => {
       if (fc && !s.nome.toLowerCase().includes(fc))         return false;
       if (fp && !s.produto.toLowerCase().includes(fp))      return false;
       if (fs === "pago"    &&  s.pago === false)             return false;
       if (fs === "nao-pago" && s.pago !== false)             return false;
       if (fi && s.data < fi)                                return false;
       if (ff && s.data > ff)                                return false;
       return true;
     });
   }
   
   function renderSalesTable() {
     const filtered    = getFilteredSales();
     const totalPages  = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
     if (currentPage > totalPages) currentPage = totalPages;
     const start       = (currentPage - 1) * itemsPerPage;
     const paginated   = filtered.slice(start, start + itemsPerPage);
   
     const pi = document.getElementById("page-info");
     const pp = document.getElementById("prev-page");
     const np = document.getElementById("next-page");
     if (pi) pi.textContent  = `Pág. ${currentPage} / ${totalPages} (${filtered.length})`;
     if (pp) pp.disabled     = currentPage === 1;
     if (np) np.disabled     = currentPage === totalPages;
   
     const div = document.getElementById("compradores");
     if (!div) return;
   
     if (!paginated.length) {
       div.innerHTML = `<div class="table-wrap"><table>
         <thead><tr><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Data</th><th>Tel.</th><th>Pgto</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
         <tbody><tr><td colspan="9" style="text-align:center;padding:24px;color:var(--chocolate2)">Nenhuma venda encontrada.</td></tr></tbody>
       </table></div>`;
       return;
     }
   
     const rows = paginated.map(s => `
       <tr>
         <td><strong>${s.nome}</strong></td>
         <td>${s.emoji || ""} ${s.produto}</td>
         <td>${s.qtd}</td>
         <td>${fmtDate(s.data)}</td>
         <td style="color:var(--chocolate2)">${s.telefone}</td>
         <td>${s.pagamento || "—"}</td>
         <td>
           <label class="toggle" onclick="togglePago('${s.id}', ${!s.pago})">
             <div class="toggle-track ${s.pago ? "on" : ""}"><div class="toggle-thumb"></div></div>
             <span class="badge ${s.pago ? "pago" : "nao-pago"}">${s.pago ? "Pago" : "Não Pago"}</span>
           </label>
         </td>
         <td style="color:var(--caramel);font-weight:500">${fmtBRL(s.total)}</td>
         <td><button class="btn btn-danger btn-sm" onclick="removeSale('${s.id}')">🗑</button></td>
       </tr>`
     ).join("");
   
     div.innerHTML = `<div class="table-wrap"><table>
       <thead><tr>
         <th>Cliente</th><th>Produto</th><th>Qtd</th><th>Data</th><th>Tel.</th><th>Pgto</th><th>Status</th><th>Valor</th><th>Ações</th>
       </tr></thead>
       <tbody>${rows}</tbody>
     </table></div>`;
   }
   
   async function togglePago(id, novoPago) {
     try {
       await updateDoc(doc(db, "sales", id), { pago: novoPago });
       toast(novoPago ? "Marcado como pago ✓" : "Marcado como não pago", novoPago ? "success" : "error");
     } catch (err) {
       console.error(err);
       toast("Erro ao atualizar status.", "error");
     }
   }
   
   async function removeSale(id) {
     if (!confirm("Remover esta venda?")) return;
     try {
       await deleteDoc(doc(db, "sales", id));
       toast("Venda removida.", "success");
     } catch (err) {
       console.error(err);
       toast("Erro ao remover.", "error");
     }
   }
   
   // ──────────────────────────────────────────────────────────────
   // 14. DÍVIDAS — AGRUPAMENTO AVANÇADO POR CLIENTE
   //     + BOTÃO "COPIAR MENSAGEM" para cobranças amigáveis
   // ──────────────────────────────────────────────────────────────
   
   /**
    * Gera uma mensagem de cobrança amigável para o cliente.
    * Lista os itens pendentes com quantidade e valor,
    * e exibe o total em aberto.
    */
   function gerarMensagemCobranca(cliente) {
     const { nome, vendas, totalAberto } = cliente;
   
     // Filtra só as vendas não pagas deste cliente
     const vendasAbertas = vendas.filter(v => !v.pago);
   
     // Agrupa os itens pendentes por produto para ficar mais limpo
     const itensPorProduto = vendasAbertas.reduce((acc, v) => {
       const chave = v.produto;
       if (!acc[chave]) acc[chave] = { emoji: v.emoji || "", nome: v.produto, qtd: 0, total: 0 };
       acc[chave].qtd   += Number(v.qtd   || 1);
       acc[chave].total += Number(v.total || 0);
       return acc;
     }, {});
   
     const linhasItens = Object.values(itensPorProduto)
       .map(i => `   ${i.emoji} ${i.nome}: ${i.qtd} un. → ${fmtBRL(i.total)}`)
       .join("\n");
   
     const primeiroNome = nome.split(" ")[0];
   
     const mensagem =
   `Olá, ${primeiroNome}! 😊
   
   Tudo bem? 
   
   Encaminhamos a prestação de contas referente às vendas de doces 
   
   ${linhasItens}
   
   💰 *Total pendente: ${fmtBRL(totalAberto)}*
   
    O pagamento pode ser realizado via Pix para o número (85) 99111-5714
    Cleice Kelly – Nubank

    Caso o pagamento já tenha sido efetuado, pedimos a gentileza de nos enviar o comprovante.
    Agradecemos  pela preferência e conte sempre com a gente! 💕`;
   
     return mensagem;
   }
   
   /**
    * Copia a mensagem de cobrança para a área de transferência
    * e exibe um feedback visual no botão clicado.
    */
   function copiarMensagem(nomeCliente, btnEl) {
     // Recupera o objeto do cliente a partir dos dados agrupados
     const fc = document.getElementById("filtro-cliente-debts")?.value.toLowerCase() || "";
     const fs = document.getElementById("filtro-status-debts")?.value                || "";
   
     let filtered = [...completedSales];
     if (fc) filtered = filtered.filter(s => s.nome.toLowerCase().includes(fc));
   
     const grouped = filtered.reduce((acc, s) => {
       if (!acc[s.nome]) acc[s.nome] = {
         nome: s.nome, telefone: s.telefone,
         qtdItens: 0, total: 0,
         totalPago: 0, totalAberto: 0,
         vendas: [], allPaid: true,
       };
       acc[s.nome].qtdItens   += Number(s.qtd || 1);
       acc[s.nome].total      += Number(s.total || 0);
       if (s.pago) acc[s.nome].totalPago   += Number(s.total || 0);
       else        acc[s.nome].totalAberto += Number(s.total || 0);
       acc[s.nome].vendas.push(s);
       if (!s.pago) acc[s.nome].allPaid = false;
       return acc;
     }, {});
   
     const cliente = grouped[nomeCliente];
     if (!cliente) { toast("Cliente não encontrado.", "error"); return; }
   
     const mensagem = gerarMensagemCobranca(cliente);
   
     // Copia para área de transferência
     navigator.clipboard.writeText(mensagem).then(() => {
       // Feedback visual no botão
       const original = btnEl.innerHTML;
       btnEl.innerHTML  = "✅ Copiado!";
       btnEl.style.background = "var(--verde, #28a745)";
       btnEl.style.color      = "#fff";
       btnEl.disabled         = true;
       setTimeout(() => {
         btnEl.innerHTML        = original;
         btnEl.style.background = "";
         btnEl.style.color      = "";
         btnEl.disabled         = false;
       }, 2500);
       toast(`Mensagem de ${nomeCliente.split(" ")[0]} copiada! 📋`, "success");
     }).catch(() => {
       // Fallback para navegadores sem suporte a clipboard API
       const ta = document.createElement("textarea");
       ta.value = mensagem;
       ta.style.position = "fixed";
       ta.style.opacity  = "0";
       document.body.appendChild(ta);
       ta.select();
       document.execCommand("copy");
       document.body.removeChild(ta);
       toast(`Mensagem de ${nomeCliente.split(" ")[0]} copiada! 📋`, "success");
     });
   }
   
   function groupByClient() {
     const fc = document.getElementById("filtro-cliente-debts")?.value.toLowerCase() || "";
     const fs = document.getElementById("filtro-status-debts")?.value                || "";
   
     let filtered = [...completedSales];
     if (fc) filtered = filtered.filter(s => s.nome.toLowerCase().includes(fc));
   
     // Agrupa
     const grouped = filtered.reduce((acc, s) => {
       if (!acc[s.nome]) acc[s.nome] = {
         nome: s.nome, telefone: s.telefone,
         qtdItens: 0, total: 0,
         totalPago: 0, totalAberto: 0,
         vendas: [], allPaid: true,
       };
       acc[s.nome].qtdItens   += Number(s.qtd || 1);
       acc[s.nome].total      += Number(s.total || 0);
       if (s.pago) acc[s.nome].totalPago   += Number(s.total || 0);
       else        acc[s.nome].totalAberto += Number(s.total || 0);
       acc[s.nome].vendas.push(s);
       if (!s.pago) acc[s.nome].allPaid = false;
       return acc;
     }, {});
   
     let entries = Object.values(grouped);
     if (fs === "nao-pago") entries = entries.filter(c => !c.allPaid);
     if (fs === "pago")     entries = entries.filter(c =>  c.allPaid);
   
     // Ordena por maior dívida
     entries.sort((a, b) => b.totalAberto - a.totalAberto);
   
     const div = document.getElementById("client-debts");
     if (!div) return;
   
     if (!entries.length) {
       div.innerHTML = `<div class="card" style="text-align:center;padding:24px;color:var(--verde)">🎉 Nenhum cliente em aberto!</div>`;
       return;
     }
   
     const rows = entries.map(c => `
       <tr>
         <td><strong>${c.nome}</strong></td>
         <td style="color:var(--chocolate2)">${c.telefone || "—"}</td>
         <td>${c.qtdItens}</td>
         <td style="color:var(--verde);font-weight:500">${fmtBRL(c.totalPago)}</td>
         <td style="color:var(--vermelho);font-weight:500">${fmtBRL(c.totalAberto)}</td>
         <td style="font-weight:500">${fmtBRL(c.total)}</td>
         <td>
           <label class="toggle" onclick="toggleClientePago('${c.nome}', ${c.allPaid})">
             <div class="toggle-track ${c.allPaid ? "on" : ""}"><div class="toggle-thumb"></div></div>
             <span class="badge ${c.allPaid ? "pago" : "nao-pago"}">${c.allPaid ? "Tudo Pago" : "Em Aberto"}</span>
           </label>
         </td>
         <td>
           ${!c.allPaid
             ? `<button
                  class="btn-copiar-msg"
                  title="Copiar mensagem de cobrança para ${c.nome}"
                  onclick="copiarMensagem('${c.nome.replace(/'/g, "\\'")}', this)">
                  📋 Copiar Mensagem
                </button>`
             : `<span style="color:var(--verde);font-size:0.8rem">✓ Quitado</span>`
           }
         </td>
       </tr>`
     ).join("");
   
     div.innerHTML = `<div class="table-wrap"><table>
       <thead><tr>
         <th>Cliente</th><th>Tel.</th><th>Itens</th><th>Recebido</th><th>Em Aberto</th><th>Total</th><th>Status</th><th>Mensagem</th>
       </tr></thead>
       <tbody>${rows}</tbody>
     </table></div>`;
   }
   
   // Marca/desmarca TODAS as vendas de um cliente
   async function toggleClientePago(nome, atualAllPaid) {
     const novoPago  = !atualAllPaid;
     const toUpdate  = completedSales.filter(s => s.nome === nome);
     try {
       await Promise.all(toUpdate.map(s => updateDoc(doc(db, "sales", s.id), { pago: novoPago })));
       toast(novoPago ? `${nome}: tudo pago ✓` : `${nome}: marcado como em aberto`, novoPago ? "success" : "error");
     } catch (err) {
       console.error(err);
       toast("Erro ao atualizar.", "error");
     }
   }
   
   // ──────────────────────────────────────────────────────────────
   // 15. DESPESAS
   // ──────────────────────────────────────────────────────────────
   document.getElementById("form-despesa")?.addEventListener("submit", async e => {
     e.preventDefault();
     const categoria = document.getElementById("categoria-despesa").value;
     const descricao = document.getElementById("descricao-despesa").value.trim();
     const valor     = parseFloat(document.getElementById("valor-despesa").value);
     const data      = document.getElementById("data-despesa").value;
   
     if (!categoria || !descricao || !valor || !data) { toast("Preencha todos os campos!", "error"); return; }
   
     const formattedDate = toLocalISODate(data);
   
     document.getElementById("modal-despesa-detalhes").innerHTML = `
       <div class="modal-row"><span>📂 Categoria</span><span>${categoria}</span></div>
       <div class="modal-row"><span>📝 Descrição</span><span>${descricao}</span></div>
       <div class="modal-row"><span>📅 Data</span><span>${fmtDate(formattedDate)}</span></div>
       <div class="modal-row"><span>💰 Valor</span><span>${fmtBRL(valor)}</span></div>`;
   
     openModal("modal-confirmacao-despesa");
   
     document.getElementById("confirmar-despesa").onclick = async () => {
       try {
         await addDoc(collection(db, "expenses"), {
           categoria, descricao, valor, data: formattedDate, timestamp: new Date(),
         });
         toast("Despesa registrada!", "success");
         document.getElementById("form-despesa").reset();
         closeModal("modal-confirmacao-despesa");
       } catch (err) {
         console.error(err);
         toast("Erro ao salvar despesa.", "error");
       }
     };
   
     document.getElementById("cancelar-despesa").onclick = () => closeModal("modal-confirmacao-despesa");
   });
   
   async function removeExpense(id) {
     if (!confirm("Remover esta despesa?")) return;
     try {
       await deleteDoc(doc(db, "expenses", id));
       toast("Despesa removida.", "success");
     } catch (err) {
       console.error(err);
       toast("Erro ao remover.", "error");
     }
   }
   
   function getFilteredExpenses() {
     const fc = document.getElementById("filtro-despesa-categoria")?.value.toLowerCase() || "";
     const fd = document.getElementById("filtro-despesa-descricao")?.value.toLowerCase() || "";
     const fi = document.getElementById("filtro-despesa-data-inicio")?.value             || "";
     const ff = document.getElementById("filtro-despesa-data-fim")?.value                || "";
   
     return currentExpenses.filter(e => {
       if (fc && !e.categoria.toLowerCase().includes(fc)) return false;
       if (fd && !e.descricao.toLowerCase().includes(fd)) return false;
       if (fi && e.data < fi)                             return false;
       if (ff && e.data > ff)                             return false;
       return true;
     });
   }
   
   function renderExpenseTable() {
     const filtered   = getFilteredExpenses();
     const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
     if (expensePage > totalPages) expensePage = totalPages;
     const start      = (expensePage - 1) * itemsPerPage;
     const paginated  = filtered.slice(start, start + itemsPerPage);
   
     const pi = document.getElementById("expense-page-info");
     const pp = document.getElementById("prev-expense-page");
     const np = document.getElementById("next-expense-page");
     if (pi) pi.textContent = `Pág. ${expensePage} / ${totalPages} (${filtered.length})`;
     if (pp) pp.disabled    = expensePage === 1;
     if (np) np.disabled    = expensePage === totalPages;
   
     const div = document.getElementById("despesas");
     if (!div) return;
   
     const catIcon = { Uber:"🚗", Materiais:"🥚", Outros:"📌", Ingredientes:"🥚", Embalagens:"📦", Transporte:"🚗", Equipamentos:"🔧" };
   
     const rows = paginated.map(e => `
       <tr>
         <td>${catIcon[e.categoria] || "📌"} ${e.categoria}</td>
         <td>${e.descricao}</td>
         <td style="color:var(--vermelho);font-weight:500">${fmtBRL(e.valor)}</td>
         <td>${fmtDate(e.data)}</td>
         <td><button class="btn btn-danger btn-sm" onclick="removeExpense('${e.id}')">🗑</button></td>
       </tr>`
     ).join("") || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--chocolate2)">Nenhuma despesa encontrada.</td></tr>`;
   
     div.innerHTML = `<div class="table-wrap"><table>
       <thead><tr><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Data</th><th>Ações</th></tr></thead>
       <tbody>${rows}</tbody>
     </table></div>`;
   }
   
   // ──────────────────────────────────────────────────────────────
   // 16. GRÁFICO DE DESPESAS (doughnut refinado)
   // ──────────────────────────────────────────────────────────────
   function renderExpenseChart() {
     const canvas = document.getElementById("expense-chart");
     if (!canvas) return;
   
     const categories = [...new Set(currentExpenses.map(e => e.categoria))];
     const data       = categories.map(cat =>
       currentExpenses.filter(e => e.categoria === cat).reduce((s, e) => s + Number(e.valor || 0), 0)
     );
   
     if (expenseChart) expenseChart.destroy();
     if (!data.length) return;
   
     expenseChart = new Chart(canvas.getContext("2d"), {
       type: "doughnut",
       data: {
         labels: categories,
         datasets: [{
           data,
           backgroundColor: ["#e91e8c","#f06292","#c0156f","#ad1457","#880e4f","#f48fb1"],
           borderWidth: 3,
           borderColor: "#fff9f4",
           hoverBorderWidth: 4,
           hoverOffset: 8,
         }],
       },
       options: {
         responsive: true,
         cutout: "65%",
         plugins: {
           legend: {
             position: "right",
             labels: { font: { size: 12, family: "DM Sans" }, padding: 16, boxWidth: 14 },
           },
           tooltip: {
             callbacks: { label: ctx => ` ${ctx.label}: ${fmtBRL(ctx.parsed)}` },
           },
         },
       },
     });
   }
   
   // ──────────────────────────────────────────────────────────────
   // 17. DASHBOARD — KPIs, GRÁFICOS E TABELA RECENTES
   // ──────────────────────────────────────────────────────────────
   function updateFinanceSummary() {
     const sales    = completedSales;
     const expenses = currentExpenses;
   
     const totalVendas   = sales.reduce((s, v) => s + Number(v.total || 0), 0);
     const totalRecebido = sales.filter(v => v.pago).reduce((s, v) => s + Number(v.total || 0), 0);
     const totalAberto   = totalVendas - totalRecebido;
     const totalDespesas = expenses.reduce((s, e) => s + Number(e.valor || 0), 0);
     const qtdAberto     = sales.filter(v => !v.pago).length;
   
     const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
     set("sum-vendas",     fmtBRL(totalVendas));
     set("sum-recebido",   fmtBRL(totalRecebido));
     set("sum-aberto",     fmtBRL(totalAberto));
     set("sum-despesas",   fmtBRL(totalDespesas));
     set("kpi-total",      fmtBRL(totalVendas));
     set("kpi-pago",       fmtBRL(totalRecebido));
     set("kpi-aberto",     fmtBRL(totalAberto));
     set("kpi-despesas",   fmtBRL(totalDespesas));
     set("kpi-qtd-vendas", sales.length + " vendas");
     set("kpi-qtd-aberto", qtdAberto + " pendentes");
   }
   
   function renderDashboardRecentes() {
     const tb = document.getElementById("tbody-recentes");
     if (!tb) return;
     const rec = completedSales.slice(0, 6);
     tb.innerHTML = rec.length
       ? rec.map(v => `
           <tr>
             <td><strong>${v.nome}</strong></td>
             <td>${v.emoji || ""} ${v.produto}</td>
             <td>${fmtDate(v.data)}</td>
             <td style="color:var(--caramel);font-weight:500">${fmtBRL(v.total)}</td>
             <td><span class="badge ${v.pago ? "pago" : "nao-pago"}">${v.pago ? "Pago" : "Não Pago"}</span></td>
           </tr>`
         ).join("")
       : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--chocolate2)">Nenhuma venda ainda.</td></tr>`;
   }
   
   function renderDashboardCharts() {
     const c1 = document.getElementById("chart-produtos");
     if (c1) {
       const prodCount = {};
       PRODUCTS.forEach(p => prodCount[p.nome] = 0);
       completedSales.forEach(s => { prodCount[s.produto] = (prodCount[s.produto] || 0) + Number(s.qtd || 1); });
   
       const labels = Object.keys(prodCount).filter(k => prodCount[k] > 0);
       const data   = labels.map(l => prodCount[l]);
   
       if (prodChart) prodChart.destroy();
       prodChart = new Chart(c1.getContext("2d"), {
         type: "bar",
         data: {
           labels,
           datasets: [{
             label: "Unidades Vendidas",
             data,
             backgroundColor: "rgba(233,30,140,0.75)",
             borderColor:      "#e91e8c",
             borderWidth: 2,
             borderRadius: 8,
             borderSkipped: false,
           }],
         },
         options: {
           indexAxis: "y",
           responsive: true,
           maintainAspectRatio: false,
           plugins: { legend: { display: false } },
           scales: {
             x: { grid: { color: "rgba(233,30,140,0.08)" }, ticks: { font: { size: 11 } } },
             y: { grid: { display: false },                ticks: { font: { size: 11 } } },
           },
         },
       });
     }
   
     renderExpenseChart();
   
     const c2 = document.getElementById("chart-despesas-cat");
     if (c2) {
       const cats = {};
       currentExpenses.forEach(d => cats[d.categoria] = (cats[d.categoria] || 0) + Number(d.valor || 0));
       const labels = Object.keys(cats);
       const data   = labels.map(l => cats[l]);
       const existChart = Chart.getChart(c2);
       if (existChart) existChart.destroy();
       if (data.length) {
         new Chart(c2.getContext("2d"), {
           type: "doughnut",
           data: {
             labels,
             datasets: [{
               data,
               backgroundColor: ["#e91e8c","#f06292","#c0156f","#ad1457","#880e4f","#f48fb1"],
               borderWidth: 3, borderColor: "#fff9f4", hoverOffset: 8,
             }],
           },
           options: {
             responsive: true, maintainAspectRatio: false, cutout: "60%",
             plugins: {
               legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 12 } },
               tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtBRL(ctx.parsed)}` } },
             },
           },
         });
       }
     }
   }
   
   // ──────────────────────────────────────────────────────────────
   // 18. EXPORTAÇÃO EXCEL (SheetJS) e JSON
   // ──────────────────────────────────────────────────────────────
   function exportarVendas() {
     const data = completedSales.map(s => ({
       Cliente:    s.nome,
       Produto:    s.produto,
       Quantidade: s.qtd,
       Data:       fmtDate(s.data),
       Telefone:   s.telefone,
       Pagamento:  s.pagamento || "—",
       Pago:       s.pago ? "Sim" : "Não",
       Valor:      Number(s.total || 0),
     }));
     if (!data.length) { toast("Nenhum dado para exportar.", "error"); return; }
     const ws = XLSX.utils.json_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Vendas");
     XLSX.writeFile(wb, "vendas_docecl.xlsx");
     toast("Exportado para Excel! ✓", "success");
   }
   
   function exportarDespesas() {
     const data = currentExpenses.map(e => ({
       Categoria:  e.categoria,
       Descrição:  e.descricao,
       Valor:      Number(e.valor || 0),
       Data:       fmtDate(e.data),
     }));
     if (!data.length) { toast("Nenhum dado para exportar.", "error"); return; }
     const ws = XLSX.utils.json_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Despesas");
     XLSX.writeFile(wb, "despesas_docecl.xlsx");
     toast("Exportado para Excel! ✓", "success");
   }
   
   // Importação JSON/XLSX
   document.getElementById("import-data-btn")?.addEventListener("click", () => {
     document.getElementById("import-data")?.click();
   });
   document.getElementById("import-data")?.addEventListener("change", e => {
     const file = e.target.files[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = async ev => {
       try {
         let rows = [];
         if (file.name.endsWith(".json")) {
           rows = JSON.parse(ev.target.result);
         } else {
           const wb  = XLSX.read(ev.target.result, { type: "binary" });
           const ws  = wb.Sheets[wb.SheetNames[0]];
           rows = XLSX.utils.sheet_to_json(ws);
         }
         let count = 0;
         for (const r of rows) {
           await addDoc(collection(db, "sales"), {
             nome:      r.Cliente || r.nome || "—",
             telefone:  r.Telefone || r.telefone || "N/A",
             produto:   r.Produto || r.produto || "—",
             qtd:       Number(r.Quantidade || r.qtd || 1),
             total:     Number(r.Valor || r.total || 0),
             data:      r.Data ? r.Data.split("/").reverse().join("-") : toLocalISODate(new Date().toISOString().split("T")[0]),
             pago:      (r.Pago || r.pago) === "Sim" || (r.Pago || r.pago) === true,
             pagamento: r.Pagamento || "—",
             timestamp: new Date(),
           });
           count++;
         }
         toast(`${count} vendas importadas!`, "success");
       } catch (err) {
         console.error(err);
         toast("Erro ao importar arquivo.", "error");
       }
     };
     file.name.endsWith(".json") ? reader.readAsText(file) : reader.readAsBinaryString(file);
     e.target.value = "";
   });
   
   document.getElementById("import-expenses-btn")?.addEventListener("click", () => {
     document.getElementById("import-expenses")?.click();
   });
   document.getElementById("import-expenses")?.addEventListener("change", e => {
     const file = e.target.files[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = async ev => {
       try {
         let rows = [];
         if (file.name.endsWith(".json")) rows = JSON.parse(ev.target.result);
         else {
           const wb = XLSX.read(ev.target.result, { type: "binary" });
           rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
         }
         for (const r of rows) {
           await addDoc(collection(db, "expenses"), {
             categoria:  r.Categoria  || r.categoria || "Outros",
             descricao:  r["Descrição"] || r.descricao || "—",
             valor:      Number(r.Valor || r.valor || 0),
             data:       r.Data ? r.Data.split("/").reverse().join("-") : toLocalISODate(new Date().toISOString().split("T")[0]),
             timestamp:  new Date(),
           });
         }
         toast("Despesas importadas!", "success");
       } catch (err) {
         console.error(err);
         toast("Erro ao importar.", "error");
       }
     };
     file.name.endsWith(".json") ? reader.readAsText(file) : reader.readAsBinaryString(file);
     e.target.value = "";
   });
   
   // ──────────────────────────────────────────────────────────────
   // 19. DEBOUNCE NOS FILTROS
   // ──────────────────────────────────────────────────────────────
   const debouncedSales = debounce(() => { currentPage = 1; renderSalesTable(); groupByClient(); updateFinanceSummary(); }, 300);
   const debouncedExp   = debounce(() => { expensePage = 1; renderExpenseTable(); }, 300);
   
   [
     "filtro-cliente", "filtro-data-inicio", "filtro-data-fim",
     "filtro-status",  "filtro-produto",
   ].forEach(id => document.getElementById(id)?.addEventListener("input", debouncedSales));
   
   [
     "filtro-cliente-debts", "filtro-status-debts",
   ].forEach(id => document.getElementById(id)?.addEventListener("input", () => groupByClient()));
   
   [
     "filtro-despesa-categoria", "filtro-despesa-descricao",
     "filtro-despesa-data-inicio", "filtro-despesa-data-fim",
   ].forEach(id => document.getElementById(id)?.addEventListener("input", debouncedExp));
   
   // ──────────────────────────────────────────────────────────────
   // 20. PAGINAÇÃO
   // ──────────────────────────────────────────────────────────────
   document.getElementById("prev-page")?.addEventListener("click", () => {
     if (currentPage > 1) { currentPage--; renderSalesTable(); }
   });
   document.getElementById("next-page")?.addEventListener("click", () => {
     currentPage++; renderSalesTable();
   });
   document.getElementById("prev-expense-page")?.addEventListener("click", () => {
     if (expensePage > 1) { expensePage--; renderExpenseTable(); }
   });
   document.getElementById("next-expense-page")?.addEventListener("click", () => {
     expensePage++; renderExpenseTable();
   });
   
   // ──────────────────────────────────────────────────────────────
   // 21. FECHA MODAL CLICANDO FORA
   // ──────────────────────────────────────────────────────────────
   document.querySelectorAll(".modal-overlay").forEach(m => {
     m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
   });
   
   document.getElementById("export-data")?.addEventListener("click", exportarVendas);
   document.getElementById("export-expenses")?.addEventListener("click", exportarDespesas);
   
   // ──────────────────────────────────────────────────────────────
   // 22. EXPÕE FUNÇÕES AO ESCOPO GLOBAL
   // ──────────────────────────────────────────────────────────────
   window.doLogin             = doLogin;
   window.doLogout            = doLogout;
   window.showPage            = showPage;
   window.limparCarrinho      = limparCarrinho;
   window.addProductDirectly  = addProductDirectly;
   window.changeQty           = changeQty;
   window.removeItem          = removeItem;
   window.togglePago          = togglePago;
   window.toggleClientePago   = toggleClientePago;
   window.removeSale          = removeSale;
   window.removeExpense       = removeExpense;
   window.exportarVendas      = exportarVendas;
   window.exportarDespesas    = exportarDespesas;
   window.copiarMensagem      = copiarMensagem;   // ← nova função exposta