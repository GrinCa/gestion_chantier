import React, { useState, useEffect } from 'react';
import { getUserProjets, createProjet, deleteProjet, type Projet } from '../api/users';

interface ProjectManagerProps {
  username: string;
  onSelectProject: (projet: Projet | null) => void;
  selectedProject: Projet | null;
}

export default function ProjectManager({ username, onSelectProject, selectedProject }: ProjectManagerProps) {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjetNom, setNewProjetNom] = useState('');
  const [newProjetDescription, setNewProjetDescription] = useState('');

  // Charger les projets au montage
  useEffect(() => {
    loadProjets();
  }, [username]);

  const loadProjets = async () => {
    try {
      setLoading(true);
      const userProjets = await getUserProjets(username);
      setProjets(userProjets);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
      alert('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProjet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjetNom.trim()) {
      alert('Le nom du projet est requis');
      return;
    }

    try {
      const newProjet = await createProjet(newProjetNom.trim(), newProjetDescription.trim(), username);
      setProjets(prev => [newProjet, ...prev]);
      setNewProjetNom('');
      setNewProjetDescription('');
      setShowCreateForm(false);
      onSelectProject(newProjet);
    } catch (error) {
      console.error('Erreur création projet:', error);
      alert('Erreur lors de la création du projet');
    }
  };

  const handleDeleteProjet = async (projet: Projet) => {
    if (!confirm(`Supprimer le projet "${projet.nom}" et toutes ses données ?`)) {
      return;
    }

    try {
      await deleteProjet(projet.id);
      setProjets(prev => prev.filter(p => p.id !== projet.id));
      if (selectedProject?.id === projet.id) {
        onSelectProject(null);
      }
    } catch (error) {
      console.error('Erreur suppression projet:', error);
      alert('Erreur lors de la suppression du projet');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border bg-white shadow max-w-4xl mx-auto">
        <div className="text-center py-8">
          <div className="text-gray-500">Chargement des projets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border bg-white shadow max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Mes Projets</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          + Nouveau Projet
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="mb-6 p-4 border rounded-lg bg-blue-50">
          <h3 className="font-semibold mb-3">Créer un nouveau projet</h3>
          <form onSubmit={handleCreateProjet} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du projet *</label>
              <input
                type="text"
                value={newProjetNom}
                onChange={(e) => setNewProjetNom(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: Maison Dupont, Rénovation Bureau..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
              <textarea
                value={newProjetDescription}
                onChange={(e) => setNewProjetDescription(e.target.value)}
                className="w-full border rounded px-3 py-2 h-20 resize-none"
                placeholder="Description du projet..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjetNom('');
                  setNewProjetDescription('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projet sélectionné */}
      {selectedProject && (
        <div className="mb-4 p-3 border-2 border-blue-500 rounded-lg bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-blue-900">📁 {selectedProject.nom}</div>
              {selectedProject.description && (
                <div className="text-sm text-blue-700">{selectedProject.description}</div>
              )}
            </div>
            <button
              onClick={() => onSelectProject(null)}
              className="text-blue-600 hover:text-blue-800"
              title="Fermer le projet"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Liste des projets */}
      {projets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📁</div>
          <div>Aucun projet trouvé</div>
          <div className="text-sm">Créez votre premier projet pour commencer</div>
        </div>
      ) : (
        <div className="space-y-2">
          {projets.map(projet => (
            <div
              key={projet.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedProject?.id === projet.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onClick={() => onSelectProject(projet)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{projet.nom}</div>
                  {projet.description && (
                    <div className="text-sm text-gray-600">{projet.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Créé le {formatDate(projet.created_at)}
                    {projet.updated_at !== projet.created_at && (
                      <> • Modifié le {formatDate(projet.updated_at)}</>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProjet(projet);
                  }}
                  className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
                  title="Supprimer le projet"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}