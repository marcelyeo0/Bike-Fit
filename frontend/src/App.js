/**
 * App.js — Miroir web de l'application desktop BikeFit.
 *
 * Même enchaînement que main.py : Questionnaire → Analyse → Bilan,
 * avec crossfade entre les vues (équivalent des fade_in/fade_out tkinter).
 *
 * Le backend Python (MediaPipe + Gemini) n'est pas branché ici : les
 * valeurs d'angles sont SIMULÉES et affichées comme telles. La webcam,
 * elle, est réelle (getUserMedia).
 */
import { useState } from 'react';
import './App.css';
import LandingView from './views/LandingView';
import SetupView from './views/SetupView';
import AnalysisView from './views/AnalysisView';
import ReportView from './views/ReportView';

export default function App() {
  // landing (marketing) -> setup -> analysis -> report
  const [view, setView] = useState('landing');
  const [profile, setProfile] = useState(null);
  const [findings, setFindings] = useState([]);

  return (
    <div className="app">
      {view === 'landing' && (
        <LandingView key="landing" onStart={() => setView('setup')} />
      )}
      {view === 'setup' && (
        <SetupView
          key="setup"
          onSubmit={(p) => { setProfile(p); setView('analysis'); }}
        />
      )}
      {view === 'analysis' && (
        <AnalysisView
          key="analysis"
          profile={profile}
          onFinish={(f) => { setFindings(f); setView('report'); }}
        />
      )}
      {view === 'report' && (
        <ReportView
          key="report"
          findings={findings}
          profile={profile}
          onClose={() => setView('setup')}
        />
      )}
    </div>
  );
}
