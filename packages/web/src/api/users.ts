// Supprime un identifiant de la whitelist
export async function deleteFromWhitelist(username: string) {
  await fetch(`${API_URL}/whitelist/${username}`, { method: "DELETE" });
}

// ===== API PROJETS ET MESURES =====

export type Projet = {
  id: string;
  nom: string;
  description: string;
  username: string;
  created_at: number;
  updated_at: number;
};

export type GroupeMesures = {
  id: string;
  label: string;
  sections: Section[];
  refToPrevId?: string | null;
  refToNextId?: string | null;
  storedRelOffset?: number | null;
};

export type Section = {
  id: string;
  label: string;
  mesures: Mesure[];
  createdAt: number;
};

export type Mesure = {
  id: string;
  raw: number;
  isRef: boolean;
  createdAt: number;
  sectionId: string;
  label?: string;
  includeInStats?: boolean;
};

// Créer un projet
export async function createProjet(nom: string, description: string, username: string): Promise<Projet> {
  const res = await fetch(`${API_URL}/projets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, description, username })
  });
  if (!res.ok) throw new Error("Erreur création projet");
  return await res.json();
}

// Lister les projets d'un utilisateur
export async function getUserProjets(username: string): Promise<Projet[]> {
  const res = await fetch(`${API_URL}/projets/${username}`);
  if (!res.ok) throw new Error("Erreur récupération projets");
  return await res.json();
}

// Supprimer un projet
export async function deleteProjet(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/projets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur suppression projet");
}

// Sauvegarder les mesures d'un projet
export async function saveMesures(projetId: string, groups: GroupeMesures[]): Promise<void> {
  const res = await fetch(`${API_URL}/projets/${projetId}/mesures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups })
  });
  if (!res.ok) throw new Error("Erreur sauvegarde mesures");
}

// Charger les mesures d'un projet
export async function loadMesures(projetId: string): Promise<GroupeMesures[]> {
  const res = await fetch(`${API_URL}/projets/${projetId}/mesures`);
  if (!res.ok) throw new Error("Erreur chargement mesures");
  const data = await res.json();
  return data.groups;
}
/**
 * Fonctions d'accès à l'API backend pour la gestion des utilisateurs et de la whitelist.
 */

export type User = {
  username: string;
  password: string;
  role: "admin" | "user";
  tools?: string[];
};

// Configuration API URL dynamique
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Ajoute ou modifie un utilisateur
export async function saveUser(user: User) {
  await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
}

// Authentifie un utilisateur (login)
export async function findUser(username: string, password: string): Promise<User | undefined> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (res.status === 403) {
    // Identifiant non autorisé (whitelist)
    const err = new Error("Identifiant non autorisé");
    // @ts-ignore
    err.status = 403;
    throw err;
  }
  if (res.ok) return await res.json();
  return undefined;
}

// Vérifie si un utilisateur existe
export async function userExists(username: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/users/${username}`);
  return res.ok;
}

// Vérifie si aucun utilisateur admin n'existe encore
export async function isFirstUser(): Promise<boolean> {
  const res = await fetch(`${API_URL}/users/admin`);
  return !res.ok;
}

// Récupère la liste de tous les utilisateurs
export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/users`);
  if (res.ok) return await res.json();
  return [];
}

// Supprime un utilisateur
export async function deleteUser(username: string) {
  await fetch(`${API_URL}/users/${username}`, { method: "DELETE" });
}

// Modifie le rôle d'un utilisateur
export async function updateUserRole(username: string, role: "admin" | "user") {
  await fetch(`${API_URL}/users/${username}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
}

// Modifie les outils accessibles d'un utilisateur
export async function updateUserTools(username: string, tools: string[]) {
  await fetch(`${API_URL}/users/${username}/tools`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tools })
  });
}

// Récupère la whitelist des identifiants autorisés
export async function getWhitelist(): Promise<string[]> {
  const res = await fetch(`${API_URL}/whitelist`);
  if (res.ok) return await res.json();
  return [];
}

// Ajoute un identifiant à la whitelist
export async function addToWhitelist(username: string) {
  await fetch(`${API_URL}/whitelist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
}
