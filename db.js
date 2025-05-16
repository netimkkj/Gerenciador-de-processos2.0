const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS processos (
      numeroProcesso TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Em andamento',
      dataInclusao TEXT,
      assunto TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      username TEXT UNIQUE,
      senha TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      processo_id TEXT,
      texto TEXT,
      dataHora TEXT,
      FOREIGN KEY (processo_id) REFERENCES processos(numeroProcesso)
    )
  `);

  // Usuário padrão
  db.run(`INSERT OR IGNORE INTO usuarios (username, senha) VALUES (?, ?)`, ['eliseu', 'Eliseu@sepog']);
});


db.run(`ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'pendente'`, err => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("Erro ao adicionar coluna status:", err.message);
  }
});

//coluna de assuntos

db.run(`ALTER TABLE processos ADD COLUMN assunto TEXT`, err => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("Erro ao adicionar coluna assunto:", err.message);
  }
});


//coluna prioridade

db.run(`ALTER TABLE processos ADD COLUMN prioridade TEXT DEFAULT 'Normal'`, err => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("Erro ao adicionar coluna prioridade:", err.message);
  }
});



module.exports = db;