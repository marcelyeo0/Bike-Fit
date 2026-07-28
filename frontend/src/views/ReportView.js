/**
 * ReportView — miroir web de la vue « Bilan » de analysis_window.py.
 * Bilan local factuel (même format que feedback.build_report) ; le bilan
 * personnalisé Gemini appartient au backend, ce qui est affiché ici est
 * annoncé comme bilan local.
 */
import { JOINT_LABELS } from '../fit';

export default function ReportView({ findings, onClose }) {
  return (
    <div className="report view-enter">
      <div className="report-inner">
        <h2 className="report-title">Bilan de séance</h2>

        <div className="card report-card">
          <p className="report-note">
            Bilan local. Le bilan personnalisé par IA est généré par
            l'application de bureau.
          </p>
          {findings.length === 0 ? (
            <p className="advice-text">
              Pas assez de données pour établir un bilan.
            </p>
          ) : (
            <ul className="report-list">
              {findings.map((f) => (
                <li key={f.joint} className="report-row">
                  <span className={'report-state ' +
                    (f.inRange ? 'report-state--ok' : 'report-state--ko')} />
                  <div>
                    <p className="report-line">
                      {JOINT_LABELS[f.joint]} : {f.value.toFixed(1)}°{' '}
                      ({f.inRange ? 'OK' : 'hors plage'})
                    </p>
                    {f.advice && <p className="report-advice">{f.advice}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="legal">
          Orientation posturale à titre indicatif. Ne remplace ni un avis
          médical ni un bike fitting complet.
        </p>

        <button type="button" className="btn btn--dark" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
