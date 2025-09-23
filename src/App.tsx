/**
 * Carnet de Niveaux Laser - Application React
 * -------------------------------------------
 * Point d'entrée principal de l'application.
 * Gère le routage entre les différentes vues (login, register, admin, calculatrice, home).
 * Centralise l'authentification et la gestion des états globaux utilisateur.
 */

import React, { useState, useEffect } from "react";
// Import admin view
import { AdminView } from "./components/admin/AdminView";
// Import calculatrice route
import { CalculatriceRoute } from "./components/outils/calculatrice/CalculatriceRoute";
// Import user home
import { UserHome } from "./components/outils/UserHome";
import {
  saveUser,
  findUser,
  userExists,
  isFirstUser,
  getWhitelist
} from "./api/users";

// --- Types ---
// Structure d'un utilisateur (voir aussi src/api/users.ts)
type User = {
  username: string;
  password: string;
  role: "admin" | "user";
  tools?: string[];
};

// --- Composant principal ---
export default function App() {
  // --- States globaux ---
  // Gère le routage principal de l'application
  const [step, setStep] = useState<"login" | "home" | "register" | "admin" | "calculatrice">("login");
  // Identifiant et mot de passe pour login/register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Rôle courant de l'utilisateur connecté
  const [role, setRole] = useState<"admin" | "user">("user");
  // Gestion des erreurs et du chargement
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- States pour l'utilisateur courant ---
  // Liste des outils accessibles à l'utilisateur connecté
  const [userTools, setUserTools] = useState<string[]>([]);

  // --- Whitelist pour inscription ---
  // Liste des identifiants autorisés à s'inscrire
  const [whitelist, setWhitelist] = useState<string[]>([]);
  useEffect(() => {
    getWhitelist().then(setWhitelist);
  }, []);

  // --- Inscription ---
  // States pour la création de compte
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");

  // --- Authentification ---
  // Gère la connexion utilisateur
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

  // Gère la création de compte utilisateur
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
    // Si premier utilisateur et username = "admin", rôle admin et tous les outils
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

  // --- Routing principal ---
  // Affiche la vue selon le step courant
  if (step === "login") {
    // Formulaire de connexion
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
    // Formulaire d'inscription
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
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Confirmation du mot de passe</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={registerPasswordConfirm}
              onChange={e => setRegisterPasswordConfirm(e.target.value)}
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
    // Vue d'administration (gestion utilisateurs, whitelist)
    return (
      <AdminView
        currentUser={username}
        onBack={() => setStep("home")}
      />
    );
  }

  if (step === "calculatrice") {
    // Vue calculatrice (statistiques, pavé numérique)
    return (
      <CalculatriceRoute
        userTools={userTools}
        onBack={() => setStep("home")}
      />
    );
  }

  if (step === "home") {
    // Vue d'accueil utilisateur (outils, déconnexion, accès admin)
    return (
      <UserHome
        username={username}
        role={role}
        userTools={userTools}
        onLogout={() => setStep("login")}
        onOpenCalculatrice={() => setStep("calculatrice")}
        onOpenAdmin={() => setStep("admin")}
      />
    );
  }
}