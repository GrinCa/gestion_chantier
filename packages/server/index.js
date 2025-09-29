/**
 * API SERVER - Gestion Chantier
 * ==============================
 * Serveur API universel pour l'architecture monorepo
 * Utilise la configuration centralisée du core
 */

import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import bodyParser from "body-parser";
import { createObservabilityRouter } from './observability.js';
// Import minimal core services (lazy CJS fallback if needed)
// Import depuis la surface officielle du core (évite les chemins internes fragiles)
import { EventBus, MetricsService, HealthService, InMemoryResourceRepository, InstrumentedResourceRepository } from '@gestion-chantier/core/node';

// Configuration centralisée depuis le core
// Note: En attendant l'import ES modules, on reproduit la logique ici
const CONFIG = {
  API_PORT: parseInt(process.env.API_PORT || process.env.PORT || '3001'),
  AUTH_SANS_MDP: process.env.AUTH_MODE !== 'strict', // true par défaut en dev  
  DB_NAME: process.env.DB_NAME || './users.db',
  DEV_AUTO_CREATE_USERS: process.env.DEV_AUTO_CREATE_USERS !== 'false' // activé par défaut (mettre false pour désactiver)
};


// sqlite3.verbose() doit être appelé sur le module importé
const db = new sqlite3.Database(CONFIG.DB_NAME);
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Core observability wiring (in-memory repo for health baseline) ---
const eventBus = new EventBus();
const metricsService = new MetricsService(eventBus);
const coreRepo = new InstrumentedResourceRepository(new InMemoryResourceRepository(), metricsService);
const healthService = new HealthService(coreRepo, metricsService);
app.use('/_obs', createObservabilityRouter({ metricsService, healthService }));

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
`, err => {
  if (err) {
    console.error("Erreur création table whitelist:", err);
  } else {
    // Ajoute automatiquement "admin" à la whitelist si absent
    db.run(
      "INSERT OR IGNORE INTO whitelist (username) VALUES (?)",
      ["admin"]
    );
  }
});

// Table projets
db.run(`
  CREATE TABLE IF NOT EXISTS projets (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (username) REFERENCES users (username)
  )
`);

// Table groupes de mesures (positions)
db.run(`
  CREATE TABLE IF NOT EXISTS groupes_mesures (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    label TEXT NOT NULL,
    ref_to_prev_id TEXT,
    ref_to_next_id TEXT,
    stored_rel_offset REAL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (projet_id) REFERENCES projets (id) ON DELETE CASCADE
  )
`);

// Table sections
db.run(`
  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    groupe_id TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (groupe_id) REFERENCES groupes_mesures (id) ON DELETE CASCADE
  )
`);

// Table mesures
db.run(`
  CREATE TABLE IF NOT EXISTS mesures (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    raw_value REAL NOT NULL,
    is_ref BOOLEAN NOT NULL DEFAULT 0,
    label TEXT,
    include_in_stats BOOLEAN NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE
  )
`);

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
  const username = req.params.username.toLowerCase();
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
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
  let { username } = req.body;
  username = username.toLowerCase();
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
  let { username, password, role, tools } = req.body;
  username = username.toLowerCase();
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
  const username = req.params.username.toLowerCase();
  db.run("DELETE FROM users WHERE username = ?", [username], err => {
    if (err) {
      console.error("Erreur SQLite:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.sendStatus(200);
  });
});

// Modifie rôle utilisateur
app.put("/users/:username/role", (req, res) => {
  const username = req.params.username.toLowerCase();
  db.run(
    "UPDATE users SET role = ? WHERE username = ?",
    [req.body.role, username],
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
  const username = req.params.username.toLowerCase();
  db.run(
    "UPDATE users SET tools = ? WHERE username = ?",
    [JSON.stringify(req.body.tools || []), username],
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
  let { username, password } = req.body;
  username = (username || '').toLowerCase();

  // MODE DEV (AUTH_SANS_MDP): on ignore complètement la whitelist
  if (CONFIG.AUTH_SANS_MDP) {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, row) => {
        if (err) {
          console.error("Erreur SQLite:", err);
          return res.status(500).json({ error: "Erreur serveur" });
        }
        if (row) {
          row.tools = row.tools ? JSON.parse(row.tools) : [];
          return res.json(row);
        }
        // Auto-création en mode dev si activée
        if (!CONFIG.DEV_AUTO_CREATE_USERS) {
          return res.status(401).send();
        }
        // Déterminer rôle + outils par défaut
        db.get("SELECT COUNT(*) as adminCount FROM users WHERE role = 'admin'", [], (err2, adminRow) => {
          if (err2) {
            console.error('Erreur comptage admin:', err2);
            return res.status(500).json({ error: 'Erreur serveur' });
          }
          const isFirstAdmin = adminRow?.adminCount === 0 && username === 'admin';
          const role = isFirstAdmin ? 'admin' : 'user';
            const tools = isFirstAdmin ? ['releve','calculatrice','export'] : ['releve','calculatrice'];
          db.run(
            "INSERT INTO users (username, password, role, tools) VALUES (?, ?, ?, ?)",
            [username, '', role, JSON.stringify(tools)],
            (insErr) => {
              if (insErr) {
                console.error('Erreur création auto utilisateur:', insErr);
                return res.status(500).json({ error: 'Erreur serveur' });
              }
              return res.json({ username, password: '', role, tools });
            }
          );
        });
      }
    );
    return;
  }

  // MODE STRICT: whitelist obligatoire
  db.get(
    "SELECT username FROM whitelist WHERE username = ?",
    [username],
    (err, whitelistRow) => {
      if (err) {
        console.error("Erreur SQLite:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      if (!whitelistRow) {
        return res.status(403).json({ error: "Identifiant non autorisé" });
      }
      // Auth classique avec mot de passe en mode strict
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

// ===== ROUTES PROJETS =====

// Créer un projet
app.post("/projets", (req, res) => {
  const { nom, description, username } = req.body;
  if (!nom || !username) {
    return res.status(400).json({ error: "Nom et username requis" });
  }
  
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  const now = Date.now();
  
  db.run(
    "INSERT INTO projets (id, nom, description, username, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, nom, description || "", username, now, now],
    function(err) {
      if (err) {
        console.error("Erreur création projet:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.json({ id, nom, description, username, created_at: now, updated_at: now });
    }
  );
});

// Lister les projets d'un utilisateur
app.get("/projets/:username", (req, res) => {
  const { username } = req.params;
  
  db.all(
    "SELECT * FROM projets WHERE username = ? ORDER BY updated_at DESC",
    [username],
    (err, rows) => {
      if (err) {
        console.error("Erreur liste projets:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.json(rows);
    }
  );
});

// Supprimer un projet
app.delete("/projets/:id", (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM projets WHERE id = ?", [id], function(err) {
    if (err) {
      console.error("Erreur suppression projet:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// ===== ROUTES MESURES =====

// Sauvegarder les données complètes d'un projet
app.post("/projets/:id/mesures", (req, res) => {
  const { id: projetId } = req.params;
  const { groups } = req.body;
  
  if (!groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: "Données groups requises" });
  }
  
  // Transaction pour sauvegarder toutes les données
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    // Supprimer les anciennes données
    db.run("DELETE FROM mesures WHERE section_id IN (SELECT id FROM sections WHERE groupe_id IN (SELECT id FROM groupes_mesures WHERE projet_id = ?))", [projetId]);
    db.run("DELETE FROM sections WHERE groupe_id IN (SELECT id FROM groupes_mesures WHERE projet_id = ?)", [projetId]);
    db.run("DELETE FROM groupes_mesures WHERE projet_id = ?", [projetId]);
    
    let errors = [];
    let completed = 0;
    const totalOperations = groups.length + groups.reduce((acc, g) => acc + g.sections.length + g.sections.reduce((acc2, s) => acc2 + s.mesures.length, 0), 0);
    
    if (totalOperations === 0) {
      db.run("COMMIT");
      return res.json({ success: true });
    }
    
    // Insérer les nouveaux groupes
    groups.forEach(group => {
      db.run(
        "INSERT INTO groupes_mesures (id, projet_id, label, ref_to_prev_id, ref_to_next_id, stored_rel_offset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [group.id, projetId, group.label, group.refToPrevId || null, group.refToNextId || null, group.storedRelOffset || null, Date.now()],
        function(err) {
          if (err) errors.push(err);
          
          // Insérer les sections
          group.sections.forEach(section => {
            db.run(
              "INSERT INTO sections (id, groupe_id, label, created_at) VALUES (?, ?, ?, ?)",
              [section.id, group.id, section.label, section.createdAt],
              function(err) {
                if (err) errors.push(err);
                
                // Insérer les mesures
                section.mesures.forEach(mesure => {
                  db.run(
                    "INSERT INTO mesures (id, section_id, raw_value, is_ref, label, include_in_stats, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [mesure.id, section.id, mesure.raw, mesure.isRef ? 1 : 0, mesure.label || null, mesure.includeInStats !== false ? 1 : 0, mesure.createdAt],
                    function(err) {
                      if (err) errors.push(err);
                      completed++;
                      
                      if (completed === totalOperations) {
                        if (errors.length > 0) {
                          db.run("ROLLBACK");
                          console.error("Erreurs sauvegarde:", errors);
                          return res.status(500).json({ error: "Erreur sauvegarde", details: errors });
                        } else {
                          db.run("COMMIT");
                          // Mettre à jour la date du projet
                          db.run("UPDATE projets SET updated_at = ? WHERE id = ?", [Date.now(), projetId]);
                          res.json({ success: true });
                        }
                      }
                    }
                  );
                });
                
                if (section.mesures.length === 0) {
                  completed++;
                  if (completed === totalOperations) {
                    if (errors.length > 0) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Erreur sauvegarde" });
                    } else {
                      db.run("COMMIT");
                      db.run("UPDATE projets SET updated_at = ? WHERE id = ?", [Date.now(), projetId]);
                      res.json({ success: true });
                    }
                  }
                }
              }
            );
          });
        }
      );
    });
  });
});

// Charger les données complètes d'un projet
app.get("/projets/:id/mesures", (req, res) => {
  const { id: projetId } = req.params;
  
  // Récupérer toutes les données en une fois
  const query = `
    SELECT 
      gm.id as groupe_id, gm.label as groupe_label, gm.ref_to_prev_id, gm.ref_to_next_id, gm.stored_rel_offset,
      s.id as section_id, s.label as section_label, s.created_at as section_created_at,
      m.id as mesure_id, m.raw_value, m.is_ref, m.label as mesure_label, m.include_in_stats, m.created_at as mesure_created_at
    FROM groupes_mesures gm
    LEFT JOIN sections s ON s.groupe_id = gm.id
    LEFT JOIN mesures m ON m.section_id = s.id
    WHERE gm.projet_id = ?
    ORDER BY gm.created_at, s.created_at, m.created_at
  `;
  
  db.all(query, [projetId], (err, rows) => {
    if (err) {
      console.error("Erreur chargement mesures:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    // Reconstituer la structure groups
    const groupsMap = new Map();
    
    rows.forEach(row => {
      if (!groupsMap.has(row.groupe_id)) {
        groupsMap.set(row.groupe_id, {
          id: row.groupe_id,
          label: row.groupe_label,
          refToPrevId: row.ref_to_prev_id,
          refToNextId: row.ref_to_next_id,
          storedRelOffset: row.stored_rel_offset,
          sections: new Map()
        });
      }
      
      const group = groupsMap.get(row.groupe_id);
      
      if (row.section_id && !group.sections.has(row.section_id)) {
        group.sections.set(row.section_id, {
          id: row.section_id,
          label: row.section_label,
          createdAt: row.section_created_at,
          mesures: []
        });
      }
      
      if (row.mesure_id) {
        const section = group.sections.get(row.section_id);
        section.mesures.push({
          id: row.mesure_id,
          raw: row.raw_value,
          isRef: Boolean(row.is_ref),
          label: row.mesure_label,
          includeInStats: Boolean(row.include_in_stats),
          createdAt: row.mesure_created_at,
          sectionId: row.section_id
        });
      }
    });
    
    // Convertir en array
    const groups = Array.from(groupsMap.values()).map(group => ({
      ...group,
      sections: Array.from(group.sections.values())
    }));
    
    res.json({ groups });
  });
});

// Route de test pour vérifier le serveur
app.get("/", (req, res) => {
  res.send("API Laser App OK");
});

// ---------------------------------------------------------------------------
// PHASE DE MIGRATION: alias /workspaces -> /projets (lecture & écriture)
// Objectif: permettre aux clients v2 d'utiliser la terminologie workspace
// sans casser les clients existants encore sur /projets. Quand la migration
// sera terminée, on pourra supprimer les routes /projets.
// ---------------------------------------------------------------------------

// Créer un workspace (alias projet)
app.post('/workspaces', (req, res)=> {
  // délègue à la route projets existante via ré-exécution de la logique
  const { nom, description, username } = req.body;
  if (!nom || !username) {
    return res.status(400).json({ error: "Nom et username requis" });
  }
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  const now = Date.now();
  db.run(
    "INSERT INTO projets (id, nom, description, username, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, nom, description || "", username, now, now],
    function(err) {
      if (err) {
        console.error("Erreur création workspace:", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      res.json({ id, nom, description, username, created_at: now, updated_at: now });
    }
  );
});

// Lister les workspaces d'un utilisateur
app.get('/workspaces/:username', (req, res)=> {
  const { username } = req.params;
  db.all(
    "SELECT * FROM projets WHERE username = ? ORDER BY updated_at DESC",
    [username],
    (err, rows)=> {
      if (err) {
        console.error('Erreur liste workspaces:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(rows.map(r => ({ ...r, nom: r.nom }))); // structure future
    }
  );
});

// Supprimer un workspace
app.delete('/workspaces/:id', (req, res)=> {
  const { id } = req.params;
  db.run("DELETE FROM projets WHERE id = ?", [id], function(err){
    if (err) {
      console.error('Erreur suppression workspace:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Sauvegarder les mesures d'un workspace (alias)
app.post('/workspaces/:id/mesures', (req, res)=> {
  req.url = req.url.replace('/workspaces', '/projets');
  // réutilise la logique existante (idempotent car même schéma)
  // On appelle explicitement la fonction handler originale via duplication serait verbeux;
  // plus simple: recopier la logique. Pour éviter code duplication, on pourrait factoriser
  // mais ceci reste temporaire durant migration.
  const { id: projetId } = req.params;
  const { groups } = req.body;
  if (!groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: "Données groups requises" });
  }
  db.serialize(()=> {
    db.run('BEGIN TRANSACTION');
    db.run("DELETE FROM mesures WHERE section_id IN (SELECT id FROM sections WHERE groupe_id IN (SELECT id FROM groupes_mesures WHERE projet_id = ?))", [projetId]);
    db.run("DELETE FROM sections WHERE groupe_id IN (SELECT id FROM groupes_mesures WHERE projet_id = ?)", [projetId]);
    db.run("DELETE FROM groupes_mesures WHERE projet_id = ?", [projetId]);
    let errors = []; let completed = 0;
    const totalOperations = groups.length + groups.reduce((acc, g) => acc + g.sections.length + g.sections.reduce((acc2, s) => acc2 + s.mesures.length, 0), 0);
    if (totalOperations === 0) { db.run('COMMIT'); return res.json({ success: true }); }
    groups.forEach(group => {
      db.run(
        "INSERT INTO groupes_mesures (id, projet_id, label, ref_to_prev_id, ref_to_next_id, stored_rel_offset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [group.id, projetId, group.label, group.refToPrevId || null, group.refToNextId || null, group.storedRelOffset || null, Date.now()],
        function(err){
          if (err) errors.push(err);
          group.sections.forEach(section => {
            db.run(
              "INSERT INTO sections (id, groupe_id, label, created_at) VALUES (?, ?, ?, ?)",
              [section.id, group.id, section.label, section.createdAt],
              function(err){
                if (err) errors.push(err);
                section.mesures.forEach(mesure => {
                  db.run(
                    "INSERT INTO mesures (id, section_id, raw_value, is_ref, label, include_in_stats, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [mesure.id, section.id, mesure.raw, mesure.isRef ? 1 : 0, mesure.label || null, mesure.includeInStats !== false ? 1 : 0, mesure.createdAt],
                    function(err){
                      if (err) errors.push(err);
                      completed++;
                      if (completed === totalOperations){
                        if (errors.length){ db.run('ROLLBACK'); return res.status(500).json({ error: 'Erreur sauvegarde', details: errors }); }
                        db.run('COMMIT'); db.run('UPDATE projets SET updated_at = ? WHERE id = ?', [Date.now(), projetId]); res.json({ success: true });
                      }
                    }
                  );
                });
                if (section.mesures.length === 0){
                  completed++;
                  if (completed === totalOperations){
                    if (errors.length){ db.run('ROLLBACK'); return res.status(500).json({ error: 'Erreur sauvegarde' }); }
                    db.run('COMMIT'); db.run('UPDATE projets SET updated_at = ? WHERE id = ?', [Date.now(), projetId]); res.json({ success: true });
                  }
                }
              }
            );
          });
        }
      );
    });
  });
});

// Charger les mesures d'un workspace
app.get('/workspaces/:id/mesures', (req, res)=> {
  const { id: projetId } = req.params;
  const query = `\n    SELECT \n      gm.id as groupe_id, gm.label as groupe_label, gm.ref_to_prev_id, gm.ref_to_next_id, gm.stored_rel_offset,\n      s.id as section_id, s.label as section_label, s.created_at as section_created_at,\n      m.id as mesure_id, m.raw_value, m.is_ref, m.label as mesure_label, m.include_in_stats, m.created_at as mesure_created_at\n    FROM groupes_mesures gm\n    LEFT JOIN sections s ON s.groupe_id = gm.id\n    LEFT JOIN mesures m ON m.section_id = s.id\n    WHERE gm.projet_id = ?\n    ORDER BY gm.created_at, s.created_at, m.created_at\n  `;
  db.all(query, [projetId], (err, rows)=> {
    if (err){ console.error('Erreur chargement mesures workspace:', err); return res.status(500).json({ error: 'Erreur serveur' }); }
    const groupsMap = new Map();
    rows.forEach(row => {
      if (!groupsMap.has(row.groupe_id)) {
        groupsMap.set(row.groupe_id, { id: row.groupe_id, label: row.groupe_label, refToPrevId: row.ref_to_prev_id, refToNextId: row.ref_to_next_id, storedRelOffset: row.stored_rel_offset, sections: new Map() });
      }
      const group = groupsMap.get(row.groupe_id);
      if (row.section_id && !group.sections.has(row.section_id)) {
        group.sections.set(row.section_id, { id: row.section_id, label: row.section_label, createdAt: row.section_created_at, mesures: [] });
      }
      if (row.mesure_id) {
        const section = group.sections.get(row.section_id);
        section.mesures.push({ id: row.mesure_id, raw: row.raw_value, isRef: Boolean(row.is_ref), label: row.mesure_label, includeInStats: Boolean(row.include_in_stats), createdAt: row.created_at, sectionId: row.section_id });
      }
    });
    const groups = Array.from(groupsMap.values()).map(g => ({ ...g, sections: Array.from(g.sections.values()) }));
    res.json({ groups });
  });
});

app.listen(CONFIG.API_PORT, err => {
  if (err) {
    console.error("Erreur au lancement du serveur:", err);
  } else {
    console.log(`🚀 API server running on port ${CONFIG.API_PORT}`);
    console.log(`🔧 Auth mode: ${CONFIG.AUTH_SANS_MDP ? 'Sans mot de passe (dev)' : 'Avec mot de passe'}`);
    console.log(`💾 Database: ${CONFIG.DB_NAME}`);
  }
});
