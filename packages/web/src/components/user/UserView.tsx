import React, { useState, useEffect } from "react";
import { UserHome } from "../UserHome";
import { CalculatriceRoute } from "../outils/calculatrice/CalculatriceRoute";
import { type Projet } from "../../api/users";

// Vue principale utilisateur : navigation accueil, outils, etc.
export function UserView({
  username,
  role,
  userTools,
  selectedProject,
  onSelectProject,
  onShowProjectManager,
  onLogout,
  onOpenAdmin,
}: {
  username: string;
  role: "admin" | "user";
  userTools: string[];
  selectedProject: Projet | null;
  onSelectProject: (projet: Projet | null) => void;
  onShowProjectManager: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}) {
  // page courante (utilisateur uniquement)
  const [page, setPage] = useState<"home" | "calculatrice">("home");

  // Si c'est l'utilisateur admin (identité unique), rediriger immédiatement
  useEffect(() => {
    if (username === 'admin') {
      onOpenAdmin();
    }
  }, [username, onOpenAdmin]);

  if (username === 'admin') {
    return null; // redirection en cours
  }

  if (page === 'calculatrice') {
    return (
      <CalculatriceRoute
        userTools={userTools}
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        onShowProjectManager={onShowProjectManager}
        onBack={() => setPage('home')}
      />
    );
  }

  return (
    <UserHome
      username={username}
      role={role}
      userTools={userTools}
      selectedProject={selectedProject}
      onSelectProject={onSelectProject}
      onShowProjectManager={onShowProjectManager}
      onLogout={onLogout}
      onOpenCalculatrice={() => setPage('calculatrice')}
      onOpenAdmin={onOpenAdmin}
    />
  );
}
