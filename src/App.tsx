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
import { AdminPanel } from "./components/AdminPanel";
import { OutilCalculatriceMoyenne } from "./components/OutilCalculatriceMoyenne";
import {
  saveUser,
  findUser,
  userExists,
  isFirstUser,
  getAllUsers,
  deleteUser,
  updateUserRole,
  getWhitelist,
  addToWhitelist
} from "./api/users";

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

  // --- Whitelist ---
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [refreshWhitelist, setRefreshWhitelist] = useState(0);

  // Ajout pour double confirmation du mot de passe lors de la création de compte
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");

  useEffect(() => {
    getWhitelist().then(setWhitelist);
  }, [refreshWhitelist]);

  // --- Ajout à la whitelist (admin) ---
  const [newWhitelistUser, setNewWhitelistUser] = useState("");
  async function handleAddWhitelist(e: React.FormEvent) {
    e.preventDefault();
    if (newWhitelistUser.trim() === "") return;
    await addToWhitelist(newWhitelistUser.trim());
    setNewWhitelistUser("");
    setRefreshWhitelist(r => r + 1);
  }

  // --- Effet : recharge la liste des utilisateurs en mode admin ---
  useEffect(() => {
    if (role === "admin" && step === "admin") {
      getAllUsers().then(setUsers);
    }
  }, [role, step, refreshUsers]);

  // --- Effet : bouton retour navigateur en mode admin ---
  useEffect(() => {
    if (step === "admin" && role === "admin") {
      const handlePopState = () => setStep("home");
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
    // Nettoie l'effet si on quitte le mode admin
    return undefined;
  }, [step, role]);

  // --- Authentification ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === "" || password.trim() === "") {
      setError("Identifiant et mot de passe requis.");
      return;
    }
    setLoading(true);
    try {
      const user = await findUser(username, password);
      setLoading(false);
      if (user) {
        setRole(user.role);
        setUserTools(user.tools ?? []);
        setStep("home");
        setError("");
      } else {
        // Si l'utilisateur n'existe pas, propose la création du compte
        if (await userExists(username)) {
          setError("Identifiants invalides.");
        } else {
          setShowRegisterPrompt(true);
          setError("");
        }
      }
    } catch (err: any) {
      setLoading(false);
      if (err?.status === 403 || err?.message?.includes("non autorisé")) {
        setError("Identifiant non autorisé. Veuillez contacter l'administrateur.");
      } else {
        setError("Erreur de connexion au serveur.");
      }
    }
  }

  // --- Inscription avec double confirmation du mot de passe ---
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === "" || registerPassword.trim() === "" || registerPasswordConfirm.trim() === "") {
      setError("Identifiant et les deux champs mot de passe sont requis.");
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!whitelist.includes(username.trim())) {
      setError("Identifiant non autorisé. Veuillez contacter l'administrateur.");
      return;
    }
    setLoading(true);
    if (await userExists(username)) {
      setLoading(false);
      setError("Identifiant déjà utilisé.");
      return;
    }
    let newRole: "admin" | "user" = "user";
    let defaultTools: string[] = [];
    if (await isFirstUser() && username === "admin") {
      newRole = "admin";
      defaultTools = ["releve", "calculatrice", "export"];
    } else {
      defaultTools = ["releve", "calculatrice"];
    }
    await saveUser({ username, password: registerPassword, role: newRole, tools: defaultTools });
    setLoading(false);
    setStep("login");
    setError("Utilisateur créé, vous pouvez vous connecter.");
    setUsername("");
    setPassword("");
    setRegisterPassword("");
    setRegisterPasswordConfirm("");
    setShowRegisterPrompt(false);
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

  if (step === "admin" && role === "admin") {
    return (
      <>
        {/* Bouton retour accueil en haut */}
        <div className="w-full flex justify-end mb-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 font-semibold"
            onClick={() => {
              setStep("home");
              window.history.pushState({}, "", "/");
            }}
          >
            Retour accueil
          </button>
        </div>
        <AdminPanel
          users={users}
          currentUser={username}
          onDeleteUser={handleDeleteUser}
          onChangeRole={handleChangeRole}
          onRefresh={() => setRefreshUsers(r => r + 1)}
          onBack={() => setStep("home")}
        />
        {/* Ajout whitelist */}
        <div className="bg-white p-4 rounded-xl shadow w-full max-w-md mx-auto mt-6">
          <h2 className="text-lg font-bold mb-2">Whitelist des identifiants autorisés</h2>
          <form className="flex gap-2 mb-2" onSubmit={handleAddWhitelist}>
            <input
              className="border rounded px-2 py-1 flex-1"
              value={newWhitelistUser}
              onChange={e => setNewWhitelistUser(e.target.value)}
              placeholder="Nouvel identifiant"
            />
            <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">
              Ajouter
            </button>
          </form>
          <ul className="text-sm mb-2">
            {whitelist.map(u => {
              const exists = users.some(user => user.username === u);
              return (
                <li key={u} className="py-0.5 flex items-center gap-2">
                  <span>{u}</span>
                  <span style={{ marginLeft: "0.5em" }}>
                    {exists ? (
                      <span className="text-green-600 text-xs font-semibold">Compte créé</span>
                    ) : (
                      <span className="text-red-600 text-xs font-semibold">Pas de compte</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </>
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