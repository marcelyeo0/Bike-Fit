/**
 * AnalysisView — miroir web de analysis_window.py.
 * Vidéo à gauche (webcam réelle via getUserMedia), panneau articulations +
 * conseils à droite. Les ANGLES sont simulés tant que le backend Python
 * (MediaPipe) n'est pas branché : bandeau démo explicite, pas de faux réel.
 *
 * Règles reprises du desktop :
 *  - textes rafraîchis 4 fois/seconde (un chiffre qui tremble fatigue) ;
 *  - couleur d'état qui GLISSE vert↔rouge (transition CSS 250 ms) ;
 *  - carte conseils qui s'allume brièvement quand son contenu change.
 */
import { useEffect, useRef, useState } from 'react';
import {
  JOINTS, JOINT_LABELS, JUDGE_STAT, DEFAULT_RANGES,
  simulatedAngles, judgedValue, analyse,
} from '../fit';

const WINDOW = 60;              // fenêtre glissante, comme angles.py

export default function AnalysisView({ onFinish }) {
  const videoRef = useRef(null);
  const historyRef = useRef({ knee: [], hip: [], elbow: [], shoulder: [] });
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [rows, setRows] = useState({});          // joint -> {value, ok}
  const [findings, setFindings] = useState([]);
  const [flashKey, setFlashKey] = useState(0);   // relance l'anim du flash
  const adviceTextRef = useRef('');

  /* Webcam réelle. Refus / absence : état d'erreur nommé, pas d'écran mort. */
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCamError(true));
    return () => stream && stream.getTracks().forEach((t) => t.stop());
  }, []);

  /* Simulation du cycle de pédalage + rafraîchissement des textes à 4 Hz. */
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const angles = simulatedAngles(t);
      const hist = historyRef.current;
      for (const j of JOINTS) {
        hist[j].push(angles[j]);
        if (hist[j].length > WINDOW) hist[j].shift();
      }
      const judged = Object.fromEntries(
        JOINTS.map((j) => [j, judgedValue(j, hist[j])])
      );
      const found = analyse(judged, DEFAULT_RANGES);
      setRows(Object.fromEntries(
        found.map((f) => [f.joint, { value: f.value, ok: f.inRange }])
      ));
      setFindings(found);

      const text = found.filter((f) => f.advice).map((f) => f.advice).join('|');
      if (text !== adviceTextRef.current) {
        adviceTextRef.current = text;
        setFlashKey((k) => k + 1);   // nouvelle valeur = l'animation rejoue
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const problems = findings.filter((f) => f.advice);

  return (
    <div className="analysis view-enter">
      <section className="video-card">
        {camError ? (
          <p className="video-fallback">
            Impossible d'ouvrir la webcam.
            <br />
            Autorise la caméra puis recharge la page.
          </p>
        ) : (
          <>
            {!camReady && (
              <p className="video-fallback video-loading">
                Démarrage caméra…
              </p>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video"
              onLoadedData={() => setCamReady(true)}
            />
          </>
        )}
        <p className="demo-note">
          Aperçu UI. Angles simulés : la détection de pose vit dans
          l'application de bureau.
        </p>
      </section>

      <aside className="panel">
        <div className="card">
          <h3 className="card-heading">Articulations</h3>
          <ul className="joints">
            {JOINTS.map((j) => {
              const row = rows[j];
              const state = row == null ? 'wait' : row.ok ? 'ok' : 'ko';
              const [lo, hi] = DEFAULT_RANGES[j];
              return (
                <li key={j} className="joint-row">
                  <div className="joint-id">
                    <span className="joint-name">{JOINT_LABELS[j]}</span>
                    <span className="joint-target">
                      cible ({JUDGE_STAT[j]}) {lo}-{hi}°
                    </span>
                  </div>
                  <div className="joint-value-wrap">
                    <span className={`joint-value joint-value--${state}`}>
                      {row == null ? '—' : `${row.value.toFixed(0)}°`}
                    </span>
                    <span className={`joint-dot joint-dot--${state}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div key={flashKey} className="card card--advice advice-flash">
          <h3 className="card-heading">Conseils en direct</h3>
          {findings.length === 0 ? (
            <p className="advice-text">
              Pédale normalement, j'observe ta position…
            </p>
          ) : problems.length === 0 ? (
            <p className="advice-text">
              Position dans les plages cibles. Continue comme ça.
            </p>
          ) : (
            problems.map((f) => (
              <p key={f.joint} className="advice-text">
                {JOINT_LABELS[f.joint]} {f.value.toFixed(0)}° (écart{' '}
                {f.delta > 0 ? '+' : ''}{f.delta.toFixed(0)}°) : {f.advice}
              </p>
            ))
          )}
        </div>

        <button
          type="button"
          className="btn btn--red"
          onClick={() => onFinish(findings)}
        >
          Terminer la session
        </button>
      </aside>
    </div>
  );
}
