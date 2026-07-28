/**
 * SetupView — miroir web de setup_window.py.
 * Split-screen : panneau de marque sombre (ancré bas) / formulaire.
 * Mêmes six questions, même grille 2 colonnes, même bouton pilule sombre.
 */
import { useState } from 'react';

const FIELDS = [
  { key: 'bike', label: 'Ton vélo', values: ['Route', 'Gravel', 'VTT', 'Ville'], def: 'Route' },
  { key: 'position', label: 'Position recherchée', values: ['Confort', 'Mixte', 'Aéro'], def: 'Mixte' },
  { key: 'flexibility', label: 'Souplesse (toucher ses pieds)', values: ['Faible', 'Moyenne', 'Bonne'], def: 'Moyenne' },
  { key: 'level', label: 'Niveau de pratique', values: ['Débutant', 'Intermédiaire', 'Confirmé'], def: 'Intermédiaire' },
  { key: 'volume', label: 'Volume hebdomadaire', values: ['< 3 h', '3-6 h', '> 6 h'], def: '3-6 h' },
  { key: 'age', label: "Tranche d'âge", values: ['< 30 ans', '30-50 ans', '> 50 ans'], def: '30-50 ans' },
];

function Segmented({ label, values, value, onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={'segment' + (value === v ? ' segment--on' : '')}
            onClick={() => onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SetupView({ onSubmit }) {
  const [form, setForm] = useState(
    Object.fromEntries(FIELDS.map((f) => [f.key, f.def]))
  );
  const [comment, setComment] = useState('');

  return (
    <div className="setup view-enter">
      <aside className="brand">
        <div className="brand-block">
          <h1 className="brand-name">BikeFit</h1>
          <p className="brand-tag">
            Analyse posturale en temps réel.
            <br />
            Ta position, mesurée et corrigée.
          </p>
          <div className="brand-rule" />
        </div>
      </aside>

      <main className="form">
        <h2 className="form-title">Ton profil</h2>
        <p className="form-sub">
          Quelques réponses pour des plages d'angles adaptées à ton corps et
          ta pratique.
        </p>

        <div className="form-grid">
          {FIELDS.map((f, i) => (
            <div key={f.key} className="stagger" style={{ '--i': i }}>
              <Segmented
                label={f.label}
                values={f.values}
                value={form[f.key]}
                onChange={(v) => setForm({ ...form, [f.key]: v })}
              />
            </div>
          ))}
        </div>

        <div className="field stagger" style={{ '--i': FIELDS.length }}>
          <label className="field-label" htmlFor="remarks">
            Remarques / douleurs
          </label>
          <textarea
            id="remarks"
            className="remarks"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder=""
          />
          <p className="field-help">
            Optionnel. L'IA en tient compte pour ajuster tes plages
            (ex. douleur au genou droit).
          </p>
        </div>

        <button
          type="button"
          className="btn btn--dark stagger"
          style={{ '--i': FIELDS.length + 1 }}
          onClick={() => onSubmit({ ...form, comment })}
        >
          Calculer mes plages d'angles
        </button>
      </main>
    </div>
  );
}
