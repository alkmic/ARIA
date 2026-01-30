import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { Practitioner } from '../../types';

interface NotesTabProps {
  practitioner: Practitioner;
}

export function NotesTab({ practitioner }: NotesTabProps) {
  const [notes, setNotes] = useState(practitioner.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simuler sauvegarde
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    // TODO: Afficher toast de confirmation
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notes personnelles</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-al-blue-500 hover:bg-al-blue-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ajoutez vos notes personnelles sur ce praticien..."
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500 h-48 resize-none"
      />

      {/* Quick tags */}
      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">Tags rapides</p>
        <div className="flex flex-wrap gap-2">
          {['À relancer', 'Intéressé télésuivi', 'Budget en attente', 'Décideur', 'Prescripteur actif'].map(tag => (
            <button
              key={tag}
              onClick={() => setNotes(n => n + (n ? '\n' : '') + `#${tag}`)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-sm transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Documents attachés (mock) */}
      <div className="glass-card p-4">
        <h4 className="font-medium mb-3">Documents partagés</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
            <FileText className="w-5 h-5 text-al-blue-500" />
            <span className="flex-1 text-sm">Brochure VitalAire Confort+.pdf</span>
            <span className="text-xs text-slate-400">Envoyé le 15/12</span>
          </div>
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
            <FileText className="w-5 h-5 text-al-blue-500" />
            <span className="flex-1 text-sm">Étude LTOT 2024.pdf</span>
            <span className="text-xs text-slate-400">Envoyé le 20/12</span>
          </div>
        </div>
        <button className="mt-3 text-sm text-al-blue-500 hover:underline">
          + Ajouter un document
        </button>
      </div>
    </div>
  );
}
