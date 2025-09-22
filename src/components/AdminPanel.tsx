import React, { useState } from "react";
import { set as idbSet } from "idb-keyval"; // Correction : import 'set' sous le nom 'idbSet'

type User = {
  username: string;
  password: string;
  role: "admin" | "user";
  tools?: string[];
};

const TOOL_LIST = [
  { key: "releve", label: "Outil Relevé de cotes" },
  { key: "calculatrice", label: "Outil Calculatrice moyenne" },
  { key: "export", label: "Outil Export CSV" },
  // Ajoute ici d'autres outils si besoin
];

export function AdminPanel({
  users,
  currentUser,
  onDeleteUser,
  onChangeRole,
  onRefresh,
  onBack,
}: {
  users: User[];
  currentUser: string;
  onDeleteUser: (username: string) => void;
  onChangeRole: (username: string, role: "admin" | "user") => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  // Paramètre global exemple
  const [companyName, setCompanyName] = useState(
    localStorage.getItem("companyName") || "Murs Sols Création"
  );
  function handleCompanyNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCompanyName(e.target.value);
    localStorage.setItem("companyName", e.target.value);
  }

  // Logs d'activité simulés
  const logs = [
    "Utilisateur admin a modifié le rôle de julien.",
    "Utilisateur julien a créé un chantier.",
    "Utilisateur admin a supprimé l'utilisateur test.",
  ];

  // Export CSV utilisateurs
  function exportUsersCSV() {
    const header = ["Identifiant", "Rôle"];
    const rows = users.map(u => [u.username, u.role]);
    const csv = [header, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "utilisateurs.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Modification des droits outils pour chaque utilisateur
  async function handleToolChange(username: string, tool: string, checked: boolean) {
    const user = users.find(u => u.username === username);
    if (!user) return;
    let newTools = user.tools ?? [];
    if (checked) {
      if (!newTools.includes(tool)) newTools = [...newTools, tool];
    } else {
      newTools = newTools.filter(t => t !== tool);
    }
    // Correction : utilise idbSet au lieu de set
    await idbSet(`user:${username}`, { ...user, tools: newTools });
    onRefresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Gestion des utilisateurs</h1>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Identifiant</th>
              <th className="py-2 text-left">Rôle</th>
              <th className="py-2 text-left">Outils</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} className="border-b">
                <td className="py-2">{u.username}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => onChangeRole(u.username, e.target.value as "admin" | "user")}
                    disabled={u.username === currentUser}
                    className="border rounded px-2 py-1"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    {TOOL_LIST.map(tool => (
                      <label key={tool.key} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={u.tools?.includes(tool.key) ?? false}
                          disabled={u.username === currentUser}
                          onChange={e => handleToolChange(u.username, tool.key, e.target.checked)}
                        />
                        <span>{tool.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  {u.username !== currentUser && (
                    <button
                      className="px-2 py-1 rounded bg-red-100 text-red-700"
                      onClick={() => onDeleteUser(u.username)}
                    >
                      Supprimer
                    </button>
                  )}
                  {u.username === currentUser && (
                    <span className="text-gray-400">Vous</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Fonctionnalités admin générales */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Paramètres globaux :</h2>
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Nom de l'entreprise</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={companyName}
              onChange={handleCompanyNameChange}
            />
          </div>
          <button
            className="px-4 py-2 rounded bg-green-100 text-green-700 mt-2"
            onClick={exportUsersCSV}
          >
            Exporter la liste des utilisateurs (CSV)
          </button>
        </div>
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Logs d'activité :</h2>
          <ul className="text-left text-xs bg-gray-50 border rounded p-2">
            {logs.map((log, i) => (
              <li key={i} className="mb-1">{log}</li>
            ))}
          </ul>
        </div>
        <button
          className="px-4 py-2 rounded bg-gray-200"
          onClick={onBack}
        >
          Retour accueil
        </button>
      </div>
    </div>
  );
}
