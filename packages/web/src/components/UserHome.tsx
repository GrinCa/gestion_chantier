import { type Projet } from "../api/users";

export function UserHome({
  username,
  role,
  userTools,
  selectedProject,
  onSelectProject,
  onShowProjectManager,
  onLogout,
  onOpenCalculatrice,
  onOpenAdmin,
}: {
  username: string;
  role: "admin" | "user";
  userTools: string[];
  selectedProject: Projet | null;
  onSelectProject: (projet: Projet | null) => void;
  onShowProjectManager: () => void;
  onLogout: () => void;
  onOpenCalculatrice: () => void;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Bienvenue, {username} !</h1>
  <p className="mb-6">Page d'accueil de l'application Carnet de Niveaux Laser.</p>
        
        {/* Gestion des projets : uniquement pour les utilisateurs finals (role === 'user') */}
  {role === "user" && (
          <div className="mb-6 p-4 border rounded-lg bg-blue-50">
            <div className="font-semibold text-blue-700 mb-2">📁 Projet actuel</div>
            {selectedProject ? (
              <div className="text-left">
                <div className="font-medium">{selectedProject.nom}</div>
                {selectedProject.description && (
                  <div className="text-sm text-gray-600">{selectedProject.description}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={onShowProjectManager}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Changer
                  </button>
                  <button
                    onClick={() => onSelectProject(null)}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-gray-600 mb-2">Aucun projet sélectionné</div>
                <button
                  onClick={onShowProjectManager}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Gérer mes projets
                </button>
              </div>
            )}
          </div>
        )}
        {/* Aucune section spécifique admin ici: l'utilisateur 'admin' est redirigé ailleurs. */}
        {/* Outils utilisateur : uniquement visibles et utilisables par les comptes 'user' */}
  {role === "user" ? (
          <div className="mb-4">
            <div className="font-semibold text-green-700">Outils utilisateur :</div>
            <div className="flex flex-col gap-3 mt-2">
              {userTools.includes("releve") && (
                <button
                  className="px-4 py-2 rounded bg-gray-100 text-gray-900 border"
                >
                  Outil Relevé de cotes
                </button>
              )}
              {/* Calculatrice moyenne : bouton qui redirige vers l'écran dédié */}
              {userTools.includes("calculatrice") ? (
                <button
                  className="px-4 py-2 rounded bg-gray-100 text-gray-900 border"
                  onClick={onOpenCalculatrice}
                >
                  Outil Calculatrice moyenne
                </button>
              ) : null}
              {userTools.includes("export") && (
                <button className="px-4 py-2 rounded bg-gray-100 text-gray-900 border">Outil Export CSV</button>
              )}
            </div>
          </div>
        ) : null}
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
