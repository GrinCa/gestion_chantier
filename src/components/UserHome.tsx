import React from "react";

export function UserHome({
  username,
  role,
  userTools,
  onLogout,
  onOpenCalculatrice,
  onOpenAdmin,
}: {
  username: string;
  role: "admin" | "user";
  userTools: string[];
  onLogout: () => void;
  onOpenCalculatrice: () => void;
  onOpenAdmin: () => void;
}) {
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
              onClick={onOpenAdmin}
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
                onClick={onOpenCalculatrice}
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
          onClick={onLogout}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
