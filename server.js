const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./db');
const session = require('express-session');


// Middlewares
app.use(express.static(__dirname));
app.use(express.json());
app.use(session({
  secret: 'chave-super-secreta',
  resave: false,
  saveUninitialized: false
}));

// Middleware para proteger rotas
function autenticar(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado' });
  }
}



// CONFIGURAR TRANSPORTE SMTP

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // 🔁 alterado de 465 para 587
  secure: false, // ❌ false para TLS
  auth: {
    user: 'eliseuverificador@gmail.com',
    pass: 'qcij lfkb bhrl ztpx' // use senha de app, não sua senha comum
  }
});


// ------------------------ ROTAS ------------------------ //

// Login
app.post('/api/login', (req, res) => {
  const { username, senha } = req.body;
  db.get(`SELECT * FROM usuarios WHERE username = ? AND senha = ? AND status = 'ativo'`, [username, senha], (err, user) => {
    if (err) {
  console.error("Erro ao fazer login:", err.message);
  return res.status(500).json({ error: 'Erro interno.' });
}
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

    req.session.usuario = user.username;
    res.json({ message: 'Login realizado com sucesso' });
  });
});

// Obter todos os processos
app.get('/api/processos', autenticar, (req, res) => {
  db.all("SELECT * FROM processos", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Obter processo específico
app.get('/api/processos/:id', autenticar, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM processos WHERE numeroProcesso = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Processo não encontrado' });
    res.json(row);
  });
});

// Adicionar processo
app.post('/api/processos', autenticar, (req, res) => {
  const { numeroProcesso, assunto, prioridade, status = "Entrada" } = req.body;

  if (!numeroProcesso) return res.status(400).json({ error: 'O número do processo é obrigatório.' });

  const dataInclusao = new Date().toLocaleDateString("pt-BR");
  const query = `INSERT INTO processos (numeroProcesso, status, dataInclusao, assunto, prioridade) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [numeroProcesso, status, dataInclusao, assunto, prioridade], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Processo já existe.' });
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ numeroProcesso, status, dataInclusao, assunto, prioridade });
  });
});



// Atualizar status
app.put('/api/processos/:id/status', autenticar, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(`UPDATE processos SET status = ? WHERE numeroProcesso = ?`, [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Status atualizado com sucesso" });
  });
});

// Atualizar assunto
app.put('/api/processos/assunto', autenticar, (req, res) => {
  const { numeroProcesso, assunto } = req.body;

  if (!numeroProcesso || !assunto) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  db.run(`UPDATE processos SET assunto = ? WHERE numeroProcesso = ?`, [assunto, numeroProcesso], function (err) {
    if (err) {
      console.error("Erro no banco de dados:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});



// Adicionar comentário
app.post('/api/processos/:id/comentarios', autenticar, (req, res) => {
  const { texto } = req.body;
  const { id } = req.params;
  const dataHora = new Date().toLocaleString("pt-BR");

  db.run(`INSERT INTO comentarios (processo_id, texto, dataHora) VALUES (?, ?, ?)`, [id, texto, dataHora], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID, texto, dataHora });
  });
});

// Obter comentários de um processo
app.get('/api/processos/:id/comentarios', autenticar, (req, res) => {
  const { id } = req.params;

  db.all(`SELECT * FROM comentarios WHERE processo_id = ? ORDER BY id DESC`, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Excluir processo
app.delete('/api/processos/:id', autenticar, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM processos WHERE numeroProcesso = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Processo excluído com sucesso" });
  });
});


// Remover comentário
app.delete('/api/comentarios/:id', autenticar, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM comentarios WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Comentário não encontrado" });
    }

    res.json({ success: true });
  });
});


app.post('/api/registro', (req, res) => {
  const { username, senha } = req.body;

  if (!username || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const query = `INSERT INTO usuarios (username, senha, status) VALUES (?, ?, 'pendente')`;

  db.run(query, [username, senha], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Usuário já existe.' });
      }
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }

    // Enviar e-mail
    const mailOptions = {
      from: 'eliseusantananeto@gmail.com',
      to: 'eliseusantananeto@gmail.com',
      subject: 'Novo Cadastro Pendente de Aprovação',
      html: `
        <h3>Solicitação de Novo Usuário</h3>
        <p><strong>Usuário:</strong> ${username}</p>
        <p><a href="http://localhost:3000/api/aprovar/${this.lastID}">✅ Aprovar</a> | 
           <a href="http://localhost:3000/api/rejeitar/${this.lastID}">❌ Rejeitar</a></p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erro ao enviar e-mail:", error);
      } else {
        console.log('E-mail enviado:', info.response);
      }
    });

    res.status(201).json({ message: "Cadastro enviado para aprovação." });
  });
});



app.get('/api/aprovar/:id', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE usuarios SET status = 'ativo' WHERE id = ?`, [id], function (err) {
    if (err) return res.send("Erro ao aprovar.");
    res.send("✅ Usuário aprovado com sucesso.");
  });
});

app.get('/api/rejeitar/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM usuarios WHERE id = ?`, [id], function (err) {
    if (err) return res.send("Erro ao rejeitar.");
    res.send("❌ Usuário rejeitado e removido.");
  });
});




// ------------------------------------------------------ //

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
