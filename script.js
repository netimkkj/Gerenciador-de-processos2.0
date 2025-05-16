let processoParaExcluir;

alert("Controlador de processos desenvolvido por Eliseu Santana.")

function irParaTelaPrincipal() {
  document.getElementById("welcomeScreen").classList.add("hidden");
  document.getElementById("mainScreen").classList.remove("hidden");

  // faz a aba 'cadastrar' seja exibida primeiro
  mostrarAba('cadastrar'); 
}

function voltarParaInicio() {
  document.getElementById("mainScreen").classList.add("hidden");
  document.getElementById("welcomeScreen").classList.remove("hidden");
}

async function atualizarGrafico() {
  try {
    const res = await fetch('/api/processos');
    const processos = await res.json();

    const totalProcessos = processos.length;
    const entrada = processos.filter(p => p.status === "Entrada").length;
    const emAndamento = processos.filter(p => p.status === "Em andamento").length;
    const concluidos = processos.filter(p => p.status === "Concluído").length;

    const ctx = document.getElementById("graficoProcessos").getContext("2d");

    if (window.meuGrafico) {
      window.meuGrafico.destroy();
    }

    window.meuGrafico = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Total de Processos",
          "Entrada",
          "Em andamento",
          "Concluídos"
        ],
        datasets: [{
          label: "Distribuição dos Processos",
          data: [totalProcessos, entrada, emAndamento, concluidos],
          backgroundColor: ["#4CAF50", "#FF5733", "#FFC107", "#007BFF", "#8E44AD"]
        }]
      }
    });
  } catch (err) {
    console.error("Erro ao carregar gráfico:", err);
  }
}

function mostrarAba(aba) {
  // Esconder todas as abas
  document.querySelectorAll(".aba").forEach(elemento => {
    elemento.classList.remove("active");
    elemento.style.display = "none";
  });

  // Mostrar apenas a aba selecionada
  const abaSelecionada = document.getElementById(aba);
  if (abaSelecionada) {
    abaSelecionada.classList.add("active");
    abaSelecionada.style.display = "block";
  }

  // Ativar a aba no menu
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  const tabButton = document.querySelector(`[onclick="mostrarAba('${aba}')"]`);
  if (tabButton) tabButton.classList.add('active');

  // Atualizar conteúdos específicos após um pequeno atraso para garantir que o DOM foi renderizado
  setTimeout(() => {
    if (aba === "listar") {
      listarProcessos();
    }
    if (aba === "estatisticas") {
      atualizarGrafico();
    }
  }, 100); // Aguarda 100ms
}

function mostrarCampoNumero() {
  const campoProcesso = document.getElementById("campoProcesso");
  campoProcesso.classList.toggle("active"); // Alterna a classe para ativar o efeito de deslizamento
}


async function adicionarProcesso(numeroProcesso = null, assunto = null, prioridade = null) {
  const descricao = numeroProcesso || document.getElementById("descricao").value.trim();
  assunto = assunto || document.getElementById("assunto").value;
  prioridade = prioridade || document.getElementById("prioridade").value;

  if (!descricao) {
    document.getElementById("descricaoError").textContent = "O número do processo é obrigatório.";
    return;
  }

  if (descricao.length < 10 || descricao.length > 20) {
    document.getElementById("descricaoError").textContent = "O número do processo deve ter entre 10 e 20 caracteres.";
    return;
  }

  try {
    const response = await fetch('/api/processos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        numeroProcesso: descricao,
        assunto: assunto,
        prioridade: prioridade
      })
    });

    const result = await response.json();

    if (!response.ok) {
      document.getElementById("descricaoError").textContent = result.error || "Erro ao adicionar processo.";
      return;
    }

    document.getElementById("descricao").value = "";
    mostrarAba('listar');

  } catch (error) {
    console.error("Erro ao adicionar processo:", error);
  }
}





function calcularTempoEmAnalise(dataInclusao) {
  if (!dataInclusao) return "Não disponível"; // Evita erros caso a data esteja ausente

  const [dia, mes, ano] = dataInclusao.split("/").map(Number);
  const dataInicio = new Date(ano, mes - 1, dia); // Ajusta para o formato correto (mês começa do zero)
  const dataAtual = new Date();
  
  const diffEmMilissegundos = dataAtual - dataInicio;
  const diasEmAnalise = Math.floor(diffEmMilissegundos / (1000 * 60 * 60 * 24)); // Converte milissegundos em dias
  
  return `${diasEmAnalise} dia(s)`;
}


async function listarProcessos() {
  try {
    const res = await fetch('/api/processos');
    const processos = await res.json();

    const colEntrada = document.getElementById('coluna-entrada');
    const colAndamento = document.getElementById('coluna-andamento');
    const colImpedimento = document.getElementById('coluna-impedimento');
    const colConcluido = document.getElementById('coluna-concluido');

    colEntrada.innerHTML = '<h3>Entrada</h3>';
    colAndamento.innerHTML = '<h3>Em andamento</h3>';
    colImpedimento.innerHTML = '<h3>Impedimento</h3>';
    colConcluido.innerHTML = '<h3>Concluído</h3>';

    processos.forEach(processo => {
      const card = document.createElement('div');
      card.onclick = () => abrirDetalhes(processo.numeroProcesso);
      card.classList.add('process-item');
      card.id = processo.numeroProcesso;
      card.draggable = true;

      const prioridadeClass = {
        "Alta": "prioridade-alta",
        "Normal": "prioridade-normal",
        "Baixa": "prioridade-baixa"
      };

      // Aplica a classe correspondente
      card.classList.add(prioridadeClass[processo.prioridade] || "prioridade-normal");


      card.innerHTML = `
        <strong>${processo.numeroProcesso}</strong><br>
        <small>Incluído em: ${processo.dataInclusao}</small><br>
        <small>Tempo: ${calcularTempoEmAnalise(processo.dataInclusao)}</small><br>
        <small>Assunto: ${(processo.assunto)}</small><br>
        <small>Prioridade: ${(processo.prioridade)}</small>
      `;

      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text', processo.numeroProcesso);
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      switch (processo.status) {
        case 'Entrada':
          colEntrada.appendChild(card);
          break;
        case 'Em andamento':
          colAndamento.appendChild(card);
          break;
        case 'Impedimento':
          colImpedimento.appendChild(card);
          break;
        case 'Concluído':
          colConcluido.appendChild(card);
          break;
          // COLUNA QUE O PROCESSO ENTRA AUTOMÁTICAMENTE - PADRÃO
        default:
          colEntrada.appendChild(card);
      }


    });

  } catch (err) {
    console.error('Erro ao listar processos:', err);
  }



  // BOTÕES DE GERAR RELATÓRIOS E VERIFICAR SE JÁ EXISTEM PARA NÃO SEREM RECRIADOS

if (!document.getElementById("relatorioButton") && !document.getElementById("relatorioDiaButton")) {
  const relatorioContainer = document.createElement("div");
  relatorioContainer.style.display = "flex";
  relatorioContainer.style.gap = "10px";
  relatorioContainer.style.marginTop = "20px";
  relatorioContainer.style.justifyContent = "center";

  const relatorioButton = document.createElement("button");
  relatorioButton.textContent = "Gerar Relatório Excel Completo";
  relatorioButton.id = "relatorioButton";
  relatorioButton.onclick = gerarRelatorioExcel;

  const relatorioDiaButton = document.createElement("button");
  relatorioDiaButton.textContent = "Gerar Relatório Diário";
  relatorioDiaButton.id = "relatorioDiaButton";
  relatorioDiaButton.onclick = gerarRelatorioDoDia;

  relatorioContainer.appendChild(relatorioButton);
  relatorioContainer.appendChild(relatorioDiaButton);

  document.getElementById("listar").appendChild(relatorioContainer);
}

}

// FUNÇÃO PARA ABRIR DETALHES DOS PROCESSOS

function abrirDetalhes(numeroProcesso) {
  fetch(`/api/processos/${encodeURIComponent(numeroProcesso)}`)
    .then(res => {
      if (!res.ok) throw new Error("Processo não encontrado");
      return res.json();
    })
    .then(processo => {
      processoSelecionado = processo.numeroProcesso;
      document.getElementById("detalhesNumero").textContent = processo.numeroProcesso;
      document.getElementById("detalhesStatus").textContent = processo.status;
      document.getElementById("detalhesData").textContent = processo.dataInclusao;
      document.getElementById("inputAssunto").value = processo.assunto || "";

      // Mostrar a lateral de detalhes
      document.getElementById("processoDetalhes").classList.remove("hidden");

      // Carregar comentários
      carregarComentarios(processo.numeroProcesso);
    })
    .catch(err => {
      console.error("Erro ao carregar detalhes:", err);
      alert("❌ Erro ao carregar detalhes do processo.");
    });
}


function confirmarExclusaoProcesso(id) {
  processoParaExcluir = id;
  document.getElementById("confirmationPopup").style.display = "flex";
}

async function confirmarExclusao() {
  try {
    const idCodificado = encodeURIComponent(processoParaExcluir);
    const response = await fetch(`/api/processos/${idCodificado}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      listarProcessos();
      fecharPopup();
    } else {
      alert("❌ Erro ao excluir processo.");
    }
  } catch (error) {
    console.error("Erro ao excluir processo:", error);
  }
}



function fecharPopup() {
  document.getElementById("confirmationPopup").style.display = "none";
}

async function alterarStatus(id, novoStatus) {
  try {
    const idCodificado = encodeURIComponent(id);
    const response = await fetch(`/api/processos/${encodeURIComponent(idCodificado)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });

    if (response.ok) {
      listarProcessos();
    } else {
      alert("❌ Erro ao alterar status.");
    }
  } catch (error) {
    console.error("Erro ao alterar status:", error);
  }
}


// 🟢 Funções de Drag and Drop (kanban)

document.querySelectorAll('.kanban-column').forEach(column => {
  column.addEventListener('dragover', e => {
    e.preventDefault();
    column.classList.add('drag-over');
  });

  column.addEventListener('dragleave', () => {
    column.classList.remove('drag-over');
  });

  column.addEventListener('drop', async e => {
    e.preventDefault();
    column.classList.remove('drag-over');

    const processoId = e.dataTransfer.getData('text'); // ID do processo
    const card = document.getElementById(processoId); // pega o card pelo ID (número do processo)

    if (card && column.contains(card) === false) {
      const novoStatus = column.dataset.status; // novo status da coluna

      // Atualiza no DOM (move o card)
      column.appendChild(card);

      try {
        const response = await fetch(`/api/processos/${encodeURIComponent(processoId)}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
          console.log(`✅ Status atualizado para: ${novoStatus}`);
          listarProcessos();
        } else {
          console.error('❌ Erro ao atualizar status:', response.statusText);
        }
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
      }
    }
  });
});




async function gerarRelatorioExcel() {
  try {
    const res = await fetch('/api/processos');
    const processos = await res.json();

    if (processos.length === 0) {
      alert("Nenhum processo encontrado para gerar relatório.");
      return;
    }

    const dadosExcel = processos.map(p => {
      const dataInclusao = p.dataInclusao ? new Date(p.dataInclusao.split('/').reverse().join('-')) : null;
      const diasAnalise = dataInclusao ? Math.floor((new Date() - dataInclusao) / (1000 * 60 * 60 * 24)) : "N/A";

      return {
        "PROCESSOS": p.numeroProcesso,
        "STATUS": p.status,
        "DATA DE INCLUSÃO": p.dataInclusao || "Não informada",
        "TEMPO DE ANÁLISE": diasAnalise + " dias"
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Processos");
    XLSX.writeFile(wb, "Relatorio_Processos.xlsx");

  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
  }
}


document.getElementById("fileInput").addEventListener("change", importarPlanilha);

// MALDITA FUNCTION PARA IMPORTAR AS PLANILHAS

function importarPlanilha() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Selecione um arquivo para importar.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Pegando a primeira aba da planilha
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertendo para JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 2) {
            alert("A planilha está vazia ou sem dados suficientes.");
            return;
        }

        // Identificando as colunas
        const headers = jsonData[0].map(header => header.toLowerCase());
        const processosIndex = headers.findIndex(header => header.includes("processo"));
        const assuntoIndex = headers.findIndex(header => header.includes("assunto"));
        const prioridadeIndex = headers.findIndex(header => header.includes("prioridade"));

        if (processosIndex === -1) {
            alert("A planilha precisa ter uma coluna 'PROCESSOS'.");
            return;
        }

        let processosImportados = 0;

        // Adicionando os processos
        for (let i = 1; i < jsonData.length; i++) {
            const numeroProcesso = jsonData[i][processosIndex];
            const assunto = assuntoIndex !== -1 ? jsonData[i][assuntoIndex] : "Não definido";
            const prioridade = prioridadeIndex !== -1 ? jsonData[i][prioridadeIndex] : "Normal";

            if (numeroProcesso) {
                adicionarProcesso(numeroProcesso, assunto, prioridade);
                processosImportados++;
            }
        }

        alert(`${processosImportados} processos importados com sucesso!`);
        listarProcessos();
    };

    reader.readAsArrayBuffer(file);
}



// RELATÓRIO DIÁRIO (APENAS DO DIA)

async function gerarRelatorioDoDia() {
  try {
    const res = await fetch('/api/processos');
    const processos = await res.json();

    const hoje = new Date().toLocaleDateString("pt-BR");
    const processosHoje = processos.filter(p => p.dataInclusao === hoje);

    if (processosHoje.length === 0) {
      alert("Nenhum processo foi adicionado hoje.");
      return;
    }

    const dadosExcel = processosHoje.map(p => ({
      "PROCESSOS": p.numeroProcesso,
      "STATUS": p.status,
      "DATA DE INCLUSÃO": p.dataInclusao || "Não informada"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Relatório_Diário");
    XLSX.writeFile(wb, `Relatorio_Processos_Dia_${hoje.replace(/\//g, "-")}.xlsx`);

  } catch (error) {
    console.error("Erro ao gerar relatório diário:", error);
  }
}

async function realizarLogin() {
  const username = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, senha })
    });

    const result = await response.json();

    if (!response.ok) {
      document.getElementById("loginErro").textContent = result.error;
      return;
    }

    // Login OK
    document.getElementById("loginScreen").classList.add("hidden");
    irParaTelaPrincipal();

  } catch (error) {
    console.error("Erro ao logar:", error);
    document.getElementById("loginErro").textContent = "Erro ao conectar com o servidor.";
  }
}


// CADASTROS

function mostrarCadastro() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("cadastroScreen").classList.remove("hidden");
}

function voltarLogin() {
  document.getElementById("cadastroScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

async function enviarCadastro() {
  const username = document.getElementById("novoUsuario").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const msg = document.getElementById("cadastroMensagem");

  msg.style.color = "black";

  if (!username || !senha) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  try {
    const res = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, senha })
    });

    const resultado = await res.json();

    if (!res.ok) {
      msg.style.color = "red";
      msg.textContent = resultado.error || "Erro ao registrar.";
      return;
    }

    msg.style.color = "green";
    msg.textContent = "Cadastro enviado para validação. Aguarde aprovação.";
  } catch (err) {
    console.error(err);
    msg.textContent = "Erro ao se comunicar com o servidor.";
  }
}



window.onload = () => {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("welcomeScreen").classList.add("hidden");
  document.getElementById("mainScreen").classList.add("hidden");
};



function salvarAssunto() {
  const assunto = document.getElementById("inputAssunto").value;
  
  if (!processoSelecionado) {
    console.error("❌ Nenhum processo selecionado.");
    return;
  }

  fetch(`/api/processos/assunto`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numeroProcesso: processoSelecionado,
      assunto: assunto
    })
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao salvar assunto");
      return res.json();
    })
    .then(() => {
      alert("✅ Assunto salvo com sucesso!");
    })
    .catch(err => {
      console.error("Erro ao salvar assunto:", err);
      alert("❌ Erro ao salvar o assunto do processo.");
    });
}



function carregarComentarios(numero) {
  fetch(`/api/processos/${encodeURIComponent(numero)}/comentarios`)
    .then(res => res.json())
    .then(comentarios => {
      if (!Array.isArray(comentarios)) {
        console.error("Resposta inesperada:", comentarios);
        return;
      }

      const lista = document.getElementById("comentariosLista");
      lista.innerHTML = "";

      // Ordena os comentários pela data/hora (do mais recente para o mais antigo)
      comentarios.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

      // Percorre os comentários e cria os elementos
      comentarios.forEach(c => {
        const comentarioItem = document.createElement("div");
        comentarioItem.classList.add("comentario-item");
        comentarioItem.innerHTML = `
          <p><strong>Publicado em:</strong> ${c.dataHora}</p>
          <p>💬 ${c.texto}</p>
          <button class="btn-excluir" onclick="excluirComentario(${c.id})">🗑️ Excluir</button>
        `;
        lista.appendChild(comentarioItem);
      });
    })
    .catch(err => {
      console.error("Erro ao carregar comentários:", err);
    });
}



function adicionarComentario() {
  const texto = document.getElementById("novoComentario").value;
  if (!texto.trim() || !processoSelecionado) return;

  fetch(`/api/processos/${encodeURIComponent(processoSelecionado)}/comentarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto })
  }).then(() => {
    document.getElementById("novoComentario").value = "";
    carregarComentarios(processoSelecionado);
  });
}


function excluirComentario(id) {
  if (!confirm("Tem certeza de que deseja excluir este comentário?")) return;

  fetch(`/api/comentarios/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Remove visualmente o comentário da lista
        const comentarioItem = document.querySelector(`button[onclick="excluirComentario(${id})"]`).parentElement;
        comentarioItem.remove();
        alert("Comentário removido com sucesso!");
      } else {
        alert("Erro ao tentar remover o comentário.");
      }
    })
    .catch(err => {
      console.error("Erro ao excluir comentário:", err);
    });
}



function excluirProcesso() {
  if (!processoSelecionado) return;

  if (confirm("Tem certeza que deseja excluir este processo?")) {
    fetch(`/api/processos/${encodeURIComponent(processoSelecionado)}`, {
      method: "DELETE"
    }).then(() => {
      listarProcessos();
      fecharDetalhes();
    });
  }
}

function fecharDetalhes() {
  // Esconde a lateral de detalhes
  document.getElementById("processoDetalhes").classList.add("hidden");

  // Limpa os campos de detalhes
  document.getElementById("detalhesNumero").textContent = "";
  document.getElementById("detalhesStatus").textContent = "";
  document.getElementById("detalhesData").textContent = "";
  document.getElementById("inputAssunto").value = "";
}

