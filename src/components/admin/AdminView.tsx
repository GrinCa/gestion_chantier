import React, { useState, useEffect } from "react";
import { AdminPanel } from "./AdminPanel";
import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  getWhitelist,
  addToWhitelist,
  deleteFromWhitelist
} from "../../api/users";
import type { User } from "../../api/users"; // Import du type User séparément

/*
  Composant AdminView :
  - Affiche le panneau d'administration avec la liste des utilisateurs.
  - Gère la récupération des utilisateurs et des identifiants autorisés (whitelist) depuis l'API.
  - Gère la suppression d'utilisateurs et la modification de leur rôle.
  - Ajoute un bouton retour pour revenir à l'accueil.
*/

export function AdminView({ currentUser, onBack }: { currentUser: string; onBack: () => void }) {
  // Liste des utilisateurs
  const [users, setUsers] = useState<User[]>([]);
  // Identifiants autorisés (whitelist)
  const [whitelist, setWhitelist] = useState<string[]>([]);

  // Récupère la liste des utilisateurs au montage
  useEffect(() => {
    async function fetchData() {
      const users = await getAllUsers();
      setUsers(users);
    }
    fetchData();
  }, []);

  // Récupère la whitelist des identifiants autorisés
  useEffect(() => {
    async function fetchWhitelist() {
      const wl = await getWhitelist();
      setWhitelist(wl);
    }
    fetchWhitelist();
  }, []);

  // Supprime un utilisateur
  function handleDeleteUser(username: string) {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${username} ?`)) {
      deleteUser(username).then(() => {
        setUsers(prev => prev.filter(u => u.username !== username));
        // Met à jour la whitelist si l'utilisateur supprimé était dans la liste
        setWhitelist(prev => prev.filter(u => u !== username));
      });
    }
  }

  // Modifie le rôle d'un utilisateur
  function handleChangeRole(username: string, role: "admin" | "user") {
    updateUserRole(username, role).then(() => {
      setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u));
    });
  }

  // Ajoute un identifiant à la whitelist
  function handleAddToWhitelist(username: string) {
    addToWhitelist(username).then(() => {
      setWhitelist(prev => [...prev, username]);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      {/* Bouton retour accueil */}
      <div className="w-full flex justify-end mb-4">
        <button
          className="px-4 py-2 rounded bg-gray-200 font-semibold"
          onClick={onBack}
        >
          Retour accueil
        </button>
      </div>
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Panneau d'administration</h1>
        <AdminPanel
          users={users}
          currentUser={currentUser}
          onDeleteUser={handleDeleteUser}
          onChangeRole={handleChangeRole}
          onRefresh={async () => {
            const refreshed = await getAllUsers();
            setUsers(refreshed);
          }}
          onBack={onBack}
        />
        {/* Whitelist des identifiants autorisés */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Identifiants autorisés (Whitelist)</h2>
          <div className="flex flex-col gap-2">
            {whitelist.map(username => (
              <div key={username} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                <span className="font-medium">{username}</span>
                <button
                  className="px-3 py-1 rounded bg-red-100 text-red-700"
                  onClick={async () => {
                    if (window.confirm(`Retirer ${username} de la whitelist ? L'utilisateur sera aussi supprimé.`)) {
                      await deleteFromWhitelist(username);
                      await deleteUser(username);
                      setWhitelist(prev => prev.filter(u => u !== username));
                      setUsers(prev => prev.filter(u => u.username !== username));
                    }
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Ajouter un identifiant"
              className="border rounded px-3 py-2 w-full"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const username = (e.target as HTMLInputElement).value.trim();
                  if (username && !whitelist.includes(username)) {
                    handleAddToWhitelist(username);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}