import React, { useState } from "react";
import { UserHome } from "../UserHome";
import { CalculatriceRoute } from "../outils/calculatrice/CalculatriceRoute";

// Vue principale utilisateur : navigation accueil, outils, etc.
export function UserView({
  username,
  role,
  userTools,
  onLogout,
  onOpenAdmin,
}: {
  username: string;
  role: "admin" | "user";
  userTools: string[];
  onLogout: () => void;
  onOpenAdmin: () => void;
}) {
  // "page" courante : accueil ou outil
  const [page, setPage] = useState<"home" | "calculatrice">("home");

  if (page === "calculatrice") {
    return (
      <CalculatriceRoute
        userTools={userTools}
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
      onLogout={onLogout}
      onOpenCalculatrice={() => setPage("calculatrice")}
      onOpenAdmin={onOpenAdmin}
    />
  );
}
