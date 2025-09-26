import React, { useState } from "react";
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
  // "page" courante : accueil ou outil
  const [page, setPage] = useState<"home" | "calculatrice">("home");

  if (page === "calculatrice") {
    return (
      <CalculatriceRoute
        userTools={userTools}
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        onShowProjectManager={onShowProjectManager}
        onBack={() => setPage("home")}
      />
    );
  }

  // Accueil utilisateur
  return (
    <UserHome
      username={username}
      role={role}
      userTools={userTools}
      selectedProject={selectedProject}
      onSelectProject={onSelectProject}
      onShowProjectManager={onShowProjectManager}
      onLogout={onLogout}
      onOpenCalculatrice={() => setPage("calculatrice")}
      onOpenAdmin={onOpenAdmin}
    />
  );
}
