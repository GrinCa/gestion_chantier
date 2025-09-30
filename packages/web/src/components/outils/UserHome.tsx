// UserHome: composant d'accueil des outils (calculatrice, etc.)

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
    <div>
      <h1>Bienvenue, {username}!</h1>
      <p>Votre rôle : {role}</p>

      <div>
        <h2>Outils disponibles :</h2>
        <ul>
          {userTools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </div>

      <div>
          {/* Only allow users (not admins) to open tools */}
          {role === "user" ? (
            <button
              onClick={onOpenCalculatrice}
              disabled={!userTools.includes("calculatrice")}
            >
              Ouvrir la calculatrice {userTools.includes("calculatrice") ? "" : "(non autorisé)"}
            </button>
          ) : (
            <div className="text-sm text-gray-600">Les administrateurs ne peuvent pas utiliser les outils ici.</div>
          )}
          {role === "admin" && <button onClick={onOpenAdmin}>Admin Panel</button>}
        <button onClick={onLogout}>Se déconnecter</button>
      </div>
    </div>
  );
}