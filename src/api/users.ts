// Supprime un identifiant de la whitelist
export async function deleteFromWhitelist(username: string) {
  await fetch(`${API_URL}/whitelist/${username}`, { method: "DELETE" });
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

const API_URL = "http://localhost:3001"; // à adapter selon config serveur

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
