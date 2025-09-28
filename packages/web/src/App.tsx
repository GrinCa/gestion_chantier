  // --- Mode d'authentification sans mot de passe ---
  // Pour activer/désactiver facilement ce mode, changez la valeur ci-dessous :
  const AUTH_SANS_MDP = true; // Mettre false pour désactiver
/**
 * Carnet de Niveaux Laser - Application React
 * -------------------------------------------
 * Point d'entrée principal de l'application.
 * Gère le routage entre les différentes vues (login, register, user, admin).
 * Centralise l'authentification et la gestion des états globaux utilisateur.
 */

import React, { useState, useEffect } from "react";
// Import admin view
import { AdminView } from "./components/admin/AdminView";
// Import user interface
import { UserView } from "./components/user/UserView";
import ProjectManager from "./components/ProjectManager";
import { TestDataEnginePage } from "./components/TestDataEngine";
import {
  saveUser,
  findUser,
  userExists,
  isFirstUser,
  getWhitelist,
  type Projet
} from "./api/users";
// Import configuration centralisée
import { getApiUrl } from "@gestion-chantier/core";

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
  const [step, setStep] = useState<"login" | "register" | "user" | "admin" | "test-engine">("login");
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
  
  // --- States pour la gestion des projets ---
  const [selectedProject, setSelectedProject] = useState<Projet | null>(null);
  const [showProjectManager, setShowProjectManager] = useState(false);

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
  // Affichage/masquage des mots de passe (login et inscription)
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] = useState(false);
  // Gère la connexion utilisateur
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === "") {
      setError("Identifiant requis.");
      return;
    }
    if (AUTH_SANS_MDP) {
      setLoading(true);
      try {
        // Auth sans mot de passe : on ignore le champ password
        const user = await findUser(username, "");
        setLoading(false);
        if (user) {
          setRole(user.role);
          setUserTools(user.tools ?? []);
          setStep("user");
          setError("");
        } else {
          if (await userExists(username)) {
            setError("Identifiant invalide.");
          } else {
            setShowRegisterPrompt(true);
            setError("");
          }
        }
      } catch (err: any) {
        setLoading(false);
        setError("Erreur de connexion au serveur.");
      }
      return;
    }
    // Auth classique avec mot de passe
    if (password.trim() === "") {
      setError("Mot de passe requis.");
      return;
    }
    setLoading(true);
    try {
      const user = await findUser(username, password);
      setLoading(false);
      if (user) {
        setRole(user.role);
        setUserTools(user.tools ?? []);
        setStep("user");
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
      setError("Ce nom d'utilisateur existe déjà. Veuillez en choisir un autre.");
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
          {!AUTH_SANS_MDP && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  className="w-full border rounded px-3 py-2 pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          )}
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            className="w-full py-2 rounded bg-black text-white font-bold"
            type="submit"
            disabled={username.trim() === "" || (!AUTH_SANS_MDP && password.trim() === "") || loading}
          >
            {loading ? "Connexion..." : AUTH_SANS_MDP ? "Connexion sans mot de passe" : "Se connecter"}
          </button>
          <button
            className="w-full py-2 rounded bg-gray-200 mt-2"
            type="button"
            onClick={() => { setStep("register"); setError(""); }}
          >
            Créer un compte
          </button>
          <button
            className="w-full py-2 rounded bg-blue-500 text-white mt-2"
            type="button"
            onClick={() => setStep("test-engine")}
          >
            🚀 Test Architecture DataEngine
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
            <div className="relative">
              <input
                className="w-full border rounded px-3 py-2 pr-10"
                type={showRegisterPassword ? "text" : "password"}
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowRegisterPassword(v => !v)}
                aria-label={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showRegisterPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Confirmation du mot de passe</label>
            <div className="relative">
              <input
                className="w-full border rounded px-3 py-2 pr-10"
                type={showRegisterPasswordConfirm ? "text" : "password"}
                value={registerPasswordConfirm}
                onChange={e => setRegisterPasswordConfirm(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowRegisterPasswordConfirm(v => !v)}
                aria-label={showRegisterPasswordConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showRegisterPasswordConfirm ? "🙈" : "👁️"}
              </button>
            </div>
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
        onBack={async () => {
          // Recharge les droits outils de l'utilisateur courant après retour admin
          const res = await fetch(`${getApiUrl()}/users/${username}`);
          if (res.ok) {
            const user = await res.json();
            setUserTools(user.tools ?? []);
          }
          setStep("user");
        }}
      />
    );
  }

  // Modal de gestion des projets (priorité sur les autres vues)
  if (showProjectManager && step === "user") {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <button
              onClick={() => {
                console.log('🔵 Closing project manager');
                setShowProjectManager(false);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ← Retour
            </button>
          </div>
          <ProjectManager
            username={username}
            selectedProject={selectedProject}
            onSelectProject={(projet) => {
              console.log('🔵 Project selected:', projet?.nom);
              setSelectedProject(projet);
              if (projet) {
                setShowProjectManager(false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "test-engine") {
    // Page de test pour la nouvelle architecture DataEngine
    return <TestDataEnginePage />;
  }

  if (step === "user") {
    // Vue principale utilisateur (symétrique à AdminView)
    return (
      <UserView
        username={username}
        role={role}
        userTools={userTools}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        onShowProjectManager={() => {
          console.log('🔵 showProjectManager triggered');
          setShowProjectManager(true);
        }}
        onLogout={() => setStep("login")}
        onOpenAdmin={() => setStep("admin")}
      />
    );
  }
}