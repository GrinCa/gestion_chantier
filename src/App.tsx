/**
 * Carnet de Niveaux Laser - Application React
 * -------------------------------------------
 * Authentification, gestion des utilisateurs, rôles, droits d'accès aux outils.
 * Persistance locale via IndexedDB (idb-keyval).
 * Interface admin séparée, interface utilisateur avec accès différencié aux outils.
 *
 * Points clés :
 * - Chaque utilisateur possède un rôle ("admin" ou "user") et une liste d'outils accessibles.
 * - L'admin peut gérer les utilisateurs, leurs rôles et leurs droits/outils.
 * - Les outils sont affichés selon les droits de chaque utilisateur.
 * - Architecture prête pour migration vers une vraie base de données.
 */

import React, { useState, useEffect } from "react";
import { set as idbSet, get, del, keys } from "idb-keyval";
import { AdminPanel } from "./components/AdminPanel";
import { OutilCalculatriceMoyenne } from "./components/OutilCalculatriceMoyenne";

// --- Types ---
/**
 * User : structure d'un utilisateur
 * - username : identifiant unique
 * - password : mot de passe (stocké en clair ici, à sécuriser en prod)
 * - role : "admin" ou "user"
 * - tools : liste des outils accessibles (par clé)
 */
type User = {
  username: string;
  password: string;
  role: "admin" | "user";
  tools?: string[];
};

// --- Fonctions de persistance utilisateur ---
/**
 * saveUser : ajoute ou modifie un utilisateur dans la base locale
 */
async function saveUser(user: User) {
  await idbSet(`user:${user.username}`, user);
}

/**
 * findUser : retrouve un utilisateur par identifiant et mot de passe
 */
async function findUser(username: string, password: string): Promise<User | undefined> {
  const user = await get(`user:${username}`);
  if (user && user.password === password) return user;
  return undefined;
}

/**
 * userExists : vérifie si un utilisateur existe déjà
 */
async function userExists(username: string): Promise<boolean> {
  const user = await get(`user:${username}`);
  return !!user;
}

/**
 * isFirstUser : détermine si le premier utilisateur admin existe
 */
async function isFirstUser(): Promise<boolean> {
  const admin = await get("user:admin");
  return !admin;
}

/**
 * getAllUsers : récupère tous les utilisateurs de la base locale
 */
async function getAllUsers(): Promise<User[]> {
  const allKeys = await keys();
  const userKeys = allKeys.filter(k => typeof k === "string" && k.startsWith("user:"));
  const users: User[] = [];
  for (const k of userKeys) {
    const user = await get(k as string);
    if (user) users.push(user);
  }
  return users;
}

/**
 * deleteUser : supprime un utilisateur
 */
async function deleteUser(username: string) {
  await del(`user:${username}`);
}

/**
 * updateUserRole : modifie le rôle d'un utilisateur
 */
async function updateUserRole(username: string, role: "admin" | "user") {
  const user = await get(`user:${username}`);
  if (user) {
    user.role = role;
    await idbSet(`user:${username}`, user);
  }
}

// --- Composant principal ---
export default function App() {
  // --- States globaux ---
  const [step, setStep] = useState<"login" | "home" | "register" | "admin" | "calculatrice">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- States pour l'admin ---
  const [users, setUsers] = useState<User[]>([]);
  const [refreshUsers, setRefreshUsers] = useState(0);

  // --- States pour l'utilisateur courant ---
  const [userTools, setUserTools] = useState<string[]>([]);

  // --- Effet : recharge la liste des utilisateurs en mode admin ---
  useEffect(() => {
    if (role === "admin" && step === "admin") {
      getAllUsers().then(setUsers);
    }
  }, [role, step, refreshUsers]);

  // --- Authentification ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === "" || password.trim() === "") {
      setError("Identifiant et mot de passe requis.");
      return;
    }
    setLoading(true);
    const user = await findUser(username, password);
    setLoading(false);
    if (user) {
      setRole(user.role);
      setUserTools(user.tools ?? []);
      setStep("home");
      setError("");
    } else {
      setError("Identifiants invalides.");
    }
  }

  // --- Inscription ---
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === "" || password.trim() === "") {
      setError("Identifiant et mot de passe requis.");
      return;
    }
    setLoading(true);
    if (await userExists(username)) {
      setLoading(false);
      setError("Identifiant déjà utilisé.");
      return;
    }
    // Définition du rôle et des outils par défaut
    let newRole: "admin" | "user" = "user";
    let defaultTools: string[] = [];
    if (await isFirstUser() && username === "admin") {
      newRole = "admin";
      defaultTools = ["releve", "calculatrice", "export"];
    } else {
      defaultTools = ["releve", "calculatrice"];
    }
    await saveUser({ username, password, role: newRole, tools: defaultTools });
    setLoading(false);
    setStep("login");
    setError("Utilisateur créé, vous pouvez vous connecter.");
    setUsername("");
    setPassword("");
  }

  // --- Actions admin ---
  async function handleDeleteUser(username: string) {
    if (window.confirm(`Supprimer l'utilisateur "${username}" ?`)) {
      await deleteUser(username);
      setRefreshUsers(r => r + 1);
    }
  }

  async function handleChangeRole(username: string, newRole: "admin" | "user") {
    await updateUserRole(username, newRole);
    setRefreshUsers(r => r + 1);
  }

  // --- Routing principal ---
  if (step === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form
          className="bg-white p-6 rounded-xl shadow w-full max-w-sm"
          onSubmit={handleLogin}
        >
          {/* Logo à la place du titre */}
          <div className="flex justify-center mb-6">
            <img
              src="/src/assets/logo-murs-sols.png"
              alt="Murs Sols Création"
              className="h-16"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Identifiant</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            className="w-full py-2 rounded bg-black text-white font-bold"
            type="submit"
          >
            Se connecter
          </button>
          <button
            className="w-full py-2 rounded bg-gray-200 mt-2"
            type="button"
            onClick={() => { setStep("register"); setError(""); }}
          >
            Créer un compte
          </button>
        </form>
      </div>
    );
  }

  if (step === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form
          className="bg-white p-6 rounded-xl shadow w-full max-w-sm"
          onSubmit={handleRegister}
        >
          <div className="flex justify-center mb-6">
            <img
              src="/src/assets/logo-murs-sols.png"
              alt="Murs Sols Création"
              className="h-16"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Identifiant</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            className="w-full py-2 rounded bg-black text-white font-bold"
            type="submit"
          >
            Valider l'inscription
          </button>
          <button
            className="w-full py-2 rounded bg-gray-200 mt-2"
            type="button"
            onClick={() => { setStep("login"); setError(""); }}
          >
            Retour connexion
          </button>
        </form>
      </div>
    );
  }

  // --- Interface admin ---
  if (step === "admin" && role === "admin") {
    return (
      <AdminPanel
        users={users}
        currentUser={username}
        onDeleteUser={handleDeleteUser}
        onChangeRole={handleChangeRole}
        onRefresh={() => setRefreshUsers(r => r + 1)}
        onBack={() => setStep("home")}
        // Les droits outils sont modifiables dans AdminPanel
      />
    );
  }

  // Nouvel écran pour la calculatrice
  if (step === "calculatrice" && userTools.includes("calculatrice")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
          <OutilCalculatriceMoyenne />
          <button
            className="mt-6 px-4 py-2 rounded bg-gray-200 w-full"
            onClick={() => setStep("home")}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // --- Interface utilisateur ---
  // Affiche uniquement les outils accessibles à l'utilisateur courant
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Bienvenue, {username} !</h1>
        <h2 className="mb-2 text-lg">Rôle : {role}</h2>
        <p className="mb-6">Page d'accueil de l'application Carnet de Niveaux Laser.</p>
        {/* Fonctionnalités admin */}
        {role === "admin" && (
          <div className="mb-4">
            <div className="font-semibold text-blue-700">Fonctionnalités administrateur :</div>
            <ul className="text-left text-sm mt-2">
              <li>• Gestion des utilisateurs</li>
              <li>• Accès à la configuration avancée</li>
              <li>• Statistiques globales</li>
            </ul>
            <button
              className="px-4 py-2 rounded bg-blue-100 text-blue-700 mt-2"
              onClick={() => setStep("admin")}
            >
              Ouvrir la gestion des utilisateurs
            </button>
          </div>
        )}
        {/* Outils utilisateur affichés selon les droits */}
        {role === "user" && (
          <div className="mb-4">
            <div className="font-semibold text-green-700">Outils utilisateur :</div>
            <div className="flex flex-col gap-3 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-900 border"
                disabled={!userTools.includes("releve")}
              >
                Outil Relevé de cotes {userTools.includes("releve") ? "" : "(non autorisé)"}
              </button>
              {/* Calculatrice moyenne : bouton qui redirige vers l'écran dédié */}
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-900 border"
                disabled={!userTools.includes("calculatrice")}
                onClick={() => setStep("calculatrice")}
              >
                Outil Calculatrice moyenne {userTools.includes("calculatrice") ? "" : "(non autorisé)"}
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-900 border"
                disabled={!userTools.includes("export")}
              >
                Outil Export CSV {userTools.includes("export") ? "" : "(non autorisé)"}
              </button>
              {/* Ajoute ici d'autres outils utilisateur */}
            </div>
          </div>
        )}
        <button
          className="px-4 py-2 rounded bg-gray-200"
          onClick={() => setStep("login")}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}

// --- Notes d'architecture ---
// - Les outils sont indépendants et seront développés dans des fichiers TSX séparés.
// - Les droits d'accès aux outils sont gérés par la propriété "tools" de chaque utilisateur.
// - L'interface admin permet de modifier ces droits pour chaque utilisateur.
// - La logique est facilement migrable vers une base de données distante.
// - Pour ajouter un nouvel outil, il suffit d'ajouter sa clé dans la propriété "tools" et dans l'interface utilisateur/admin.