import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import bodyParser from "body-parser";

// sqlite3.verbose() doit être appelé sur le module importé
const db = new sqlite3.Database("./users.db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Création table utilisateurs si non existante
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    tools TEXT
  )
`);

// Table whitelist
db.run(`
  CREATE TABLE IF NOT EXISTS whitelist (
    username TEXT PRIMARY KEY
  )
`);

// Ajoute automatiquement "admin" à la whitelist si absent
db.run(
  "INSERT OR IGNORE INTO whitelist (username) VALUES (?)",
  ["admin"]
);

// Liste tous les utilisateurs
app.get("/users", (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      console.error("Erreur SQLite:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    rows.forEach(u => u.tools = u.tools ? JSON.parse(u.tools) : []);
    res.json(rows);
  });
});

// Vérifie existence utilisateur
app.get("/users/:username", (req, res) => {
  db.get("SELECT * FROM users WHERE username = ?", [req.params.username], (err, row) => {
    if (err) {
      console.error("Erreur SQLite:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    if (row) {
      row.tools = row.tools ? JSON.parse(row.tools) : [];
      res.json(row);
    } else {
      res.status(404).send();
    }
  });
});

// Liste whitelist
app.get("/whitelist", (req, res) => {
  db.all("SELECT username FROM whitelist", [], (err, rows) => {
    if (err) {
      console.error("Erreur SQLite:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows.map(r => r.username));
  });
});

// Ajout whitelist
app.post("/whitelist", (req, res) => {
  const { username } = req.body;
  db.run(
    "INSERT OR IGNORE INTO whitelist (username) VALUES (?)",
    [username],
    err => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.sendStatus(200);
    }
  );
});

// Ajoute ou modifie utilisateur
app.post("/users", (req, res) => {
  const { username, password, role, tools } = req.body;
  db.run(
    "INSERT OR REPLACE INTO users (username, password, role, tools) VALUES (?, ?, ?, ?)",
    [username, password, role, JSON.stringify(tools || [])],
    err => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.sendStatus(200);
    }
  );
});

// Supprime utilisateur
app.delete("/users/:username", (req, res) => {
  db.run("DELETE FROM users WHERE username = ?", [req.params.username], err => {
    if (err) {
      console.error("Erreur SQLite:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.sendStatus(200);
  });
});

// Modifie rôle utilisateur
app.put("/users/:username/role", (req, res) => {
  db.run(
    "UPDATE users SET role = ? WHERE username = ?",
    [req.body.role, req.params.username],
    err => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.sendStatus(200);
    }
  );
});

// Modifie les outils utilisateur
app.put("/users/:username/tools", (req, res) => {
  db.run(
    "UPDATE users SET tools = ? WHERE username = ?",
    [JSON.stringify(req.body.tools || []), req.params.username],
    err => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.sendStatus(200);
    }
  );
});

// Authentification
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Vérifie d'abord la whitelist
  db.get(
    "SELECT username FROM whitelist WHERE username = ?",
    [username],
    (err, whitelistRow) => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      if (!whitelistRow) {
        // Identifiant non autorisé
        return res.status(403).json({ error: "Identifiant non autorisé" });
      }
      // Si autorisé, vérifie le mot de passe
      db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, row) => {
          if (err) {
            console.error("Erreur SQLite:", err);
            return res.status(500).json({ error: "Erreur serveur" });
          }
          if (row) {
            row.tools = row.tools ? JSON.parse(row.tools) : [];
            res.json(row);
          } else {
            res.status(401).send();
          }
        }
      );
    }
  );
});

// Route de test pour vérifier le serveur
app.get("/", (req, res) => {
  res.send("API Laser App OK");
});

app.listen(3001, err => {
  if (err) {
    console.error("Erreur au lancement du serveur:", err);
  } else {
    console.log("API server running on port 3001");
  }
});
