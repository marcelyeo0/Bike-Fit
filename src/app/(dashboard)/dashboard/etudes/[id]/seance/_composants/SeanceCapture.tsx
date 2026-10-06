'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Camera, FilmStrip, FloppyDisk, Stop } from '@phosphor-icons/react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { ContexteSeance } from '../../../../../../../lib/requetes/plages';
import {
  ARTICULATIONS,
  POINTS_ANGLE,
  SuiviAngles,
  calculerAngles,
  estComplet,
  type Angles,
  type Articulation,
  type NomPoint,
  type PointsProfil,
} from '../../../../../../../lib/biomeca/angles';
import {
  consignesParPriorite,
  etablirConstats,
  type Constat,
} from '../../../../../../../lib/biomeca/regles';
import {
  LIBELLES_JOINT,
  LIBELLES_MESURE,
  formaterCm,
  formaterDegres,
} from '../../../../../../../lib/libelles';
import type { MeasurementStatus } from '../../../../../../../generated/prisma/enums';
import {
  BLOC,
  BOUTON_CONTOUR,
  BOUTON_PRIMAIRE,
  LIEN_ACCENT,
  MESSAGE_ERREUR,
  MESSAGE_INFO,
  SURTITRE,
} from '../../../../../_composants/classes';
import { actionEnregistrerSeance } from '../../../actions';

/**
 * Seance de capture : fenetre video a gauche, retours texte a droite.
 *
 * Composant client parce que tout se passe ici : camera, detection de pose,
 * calcul des angles. AUCUNE image ne quitte le navigateur — le modele et son
 * runtime WASM sont servis par l'application (public/mediapipe), et seuls les
 * quatre angles juges partent vers le serveur, au clic sur « Enregistrer ».
 *
 * Il ne decide de rien : la server action recalcule fourchettes, statuts et
 * consignes a partir de ce que le serveur a fige a l'ouverture de la seance.
 */

const CHEMIN_WASM = '/mediapipe/wasm';
const CHEMIN_MODELE = '/mediapipe/pose_landmarker.task';

/** Indices des points MediaPipe, pour chaque cote du corps. */
const POINTS_COTE: Record<'gauche' | 'droit', Record<NomPoint, number>> = {
  gauche: { epaule: 11, coude: 13, poignet: 15, hanche: 23, genou: 25, cheville: 27 },
  droit: { epaule: 12, coude: 14, poignet: 16, hanche: 24, genou: 26, cheville: 28 },
};
const NOMS_POINTS = Object.keys(POINTS_COTE.gauche) as NomPoint[];

const SEGMENTS: [NomPoint, NomPoint][] = [
  ['epaule', 'coude'],
  ['coude', 'poignet'],
  ['epaule', 'hanche'],
  ['hanche', 'genou'],
  ['genou', 'cheville'],
];

/**
 * Deux seuils de visibilite. Un point se DESSINE des qu'il est a peu pres
 * vu : le squelette apparait meme quand le corps n'est pas entier, et le
 * velociste voit ce que l'outil suit. Un point ne sert a MESURER un angle que
 * s'il est bien vu.
 */
const VISIBILITE_TRACE = 0.3;
const VISIBILITE_MESURE = 0.5;

/** Delai avant de signaler qu'aucune personne n'est detectee. */
const DELAI_ALERTE_MS = 1500;
/** Une consigne ne s'affiche (ou ne s'efface) qu'apres avoir tenu ce delai. */
const DELAI_CONSIGNE_MS = 1500;
/** Au plus une detection toutes les 30 ms : inutile d'aller plus vite que la video. */
const PERIODE_ANALYSE_MS = 30;
/** Cadence de mise a jour du panneau de texte : la video, elle, reste fluide. */
const PERIODE_TEXTE_MS = 250;

// Tokens de tailwind.config.js, rejoues ici : le canvas ne lit pas les classes.
const ENCRE = '#0C0C0C';
const ROUGE = '#E8332A';
const BLANC = '#FFFFFF';

const TON_STATUT: Record<MeasurementStatus, string> = {
  OK: 'text-texte-doux',
  WARNING: 'font-semibold text-encre',
  OUT: 'font-semibold text-rouge-texte',
};

/** Ce qu'il faut voir a l'image pour mesurer chaque angle. */
const ZONE_REQUISE: Record<Articulation, string> = {
  KNEE: 'hanche, genou et cheville',
  HIP: 'épaule, hanche et genou',
  ELBOW: 'épaule, coude et poignet',
  SHOULDER: 'coude, épaule et hanche',
};

type Source = 'camera' | 'fichier';
type Etat = 'inactif' | 'chargement' | 'actif';
type Installation = 'attente' | 'personne' | 'partielle' | 'correcte';

const MESSAGES_INSTALLATION: Record<Installation, string> = {
  attente: 'Recherche du cycliste dans l’image…',
  personne:
    'Aucune personne détectée. Vérifiez l’éclairage et placez le cycliste entier dans l’image.',
  partielle:
    'Cycliste détecté en partie : reculez la caméra pour voir tout le profil, de l’épaule à la cheville.',
  correcte: 'Cycliste bien visible, de profil.',
};

export default function SeanceCapture({
  contexte,
  lienFiche,
}: {
  contexte: ContexteSeance;
  lienFiche: string | null;
}) {
  const { seance } = contexte;

  const [etat, setEtat] = useState<Etat>('inactif');
  const [source, setSource] = useState<Source | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [installation, setInstallation] = useState<Installation>('attente');
  const [constats, setConstats] = useState<Constat[]>([]);
  const [complet, setComplet] = useState(false);
  const [consigne, setConsigne] = useState<Constat | null>(null);
  const [envoi, demarrerEnvoi] = useTransition();

  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const detecteur = useRef<PoseLandmarker | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const adresseFichier = useRef<string | null>(null);
  const boucle = useRef<number | null>(null);
  const suivi = useRef(new SuiviAngles());
  const valeurs = useRef<Partial<Angles>>({});
  const horsFourchette = useRef(new Set<Articulation>());
  const derniereAnalyse = useRef(0);
  const dernierTexte = useRef(0);
  const sansPoseDepuis = useRef<number | null>(null);
  const installationCourante = useRef<Installation>('attente');
  const candidat = useRef<{ cle: Articulation | null; depuis: number }>({ cle: null, depuis: 0 });

  /** Charge le modele au premier demarrage, GPU d'abord, processeur en repli. */
  const obtenirDetecteur = useCallback(async (): Promise<PoseLandmarker> => {
    if (detecteur.current) return detecteur.current;

    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const fichiers = await FilesetResolver.forVisionTasks(CHEMIN_WASM);
    const creer = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fichiers, {
        baseOptions: { modelAssetPath: CHEMIN_MODELE, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

    detecteur.current = await creer('GPU').catch(() => creer('CPU'));
    return detecteur.current;
  }, []);

  const dessiner = useCallback((points: PointsProfil | null) => {
    const toile = canvas.current;
    const image = video.current;
    if (!toile || !image) return;

    if (toile.width !== image.videoWidth || toile.height !== image.videoHeight) {
      toile.width = image.videoWidth;
      toile.height = image.videoHeight;
    }
    const contexte2d = toile.getContext('2d');
    if (!contexte2d) return;
    contexte2d.clearRect(0, 0, toile.width, toile.height);
    if (!points) return;

    // Epaisseurs proportionnelles a l'image : lisibles en 720p comme en 4K.
    const unite = Math.max(2, toile.width / 320);
    contexte2d.lineCap = 'round';

    for (const [couleur, epaisseur] of [
      [ENCRE, unite * 2.2],
      [BLANC, unite],
    ] as const) {
      contexte2d.strokeStyle = couleur;
      contexte2d.lineWidth = epaisseur;
      contexte2d.beginPath();
      for (const [debut, fin] of SEGMENTS) {
        const a = points[debut];
        const b = points[fin];
        if (!a || !b) continue;
        contexte2d.moveTo(a.x, a.y);
        contexte2d.lineTo(b.x, b.y);
      }
      contexte2d.stroke();
    }

    // Le sommet d'un angle hors fourchette passe au rouge.
    const sommetsHors = new Set(
      [...horsFourchette.current].map((articulation) => POINTS_ANGLE[articulation][1])
    );
    for (const nom of NOMS_POINTS) {
      const point = points[nom];
      if (!point) continue;
      contexte2d.beginPath();
      contexte2d.arc(point.x, point.y, unite * 2.4, 0, Math.PI * 2);
      contexte2d.fillStyle = sommetsHors.has(nom) ? ROUGE : BLANC;
      contexte2d.fill();
      contexte2d.lineWidth = unite * 0.8;
      contexte2d.strokeStyle = ENCRE;
      contexte2d.stroke();
    }
  }, []);

  const actualiserTexte = useCallback(
    (maintenant: number) => {
      const jugees = suivi.current.valeursJugees();
      valeurs.current = jugees;

      const nouveaux = etablirConstats(
        jugees,
        seance.plages,
        seance.conseils,
        contexte.entrejambeCm
      );
      horsFourchette.current = new Set(
        nouveaux.filter((constat) => constat.statut === 'OUT').map((c) => c.articulation)
      );
      setConstats(nouveaux);
      setComplet(estComplet(jugees));
      setInstallation(installationCourante.current);

      // Hysteresis : la consigne prioritaire ne change qu'une fois stable,
      // pour ne pas clignoter quand un angle oscille autour d'une borne.
      const prioritaire = consignesParPriorite(nouveaux)[0] ?? null;
      const cle = prioritaire?.articulation ?? null;
      if (cle !== candidat.current.cle) {
        candidat.current = { cle, depuis: maintenant };
      } else if (maintenant - candidat.current.depuis >= DELAI_CONSIGNE_MS) {
        setConsigne(prioritaire);
      }
    },
    [contexte.entrejambeCm, seance.conseils, seance.plages]
  );

  const analyser = useCallback(() => {
    boucle.current = requestAnimationFrame(analyser);

    const image = video.current;
    const modele = detecteur.current;
    if (!image || !modele || image.readyState < 2 || image.videoWidth === 0) return;

    // Cadence bornee par l'horloge, pas par `currentTime` : selon la source
    // (camera, fichier en boucle, image figee) ce dernier peut ne pas avancer
    // d'une image a l'autre, et l'analyse s'arreterait sans rien signaler.
    const maintenant = performance.now();
    if (maintenant - derniereAnalyse.current < PERIODE_ANALYSE_MS) return;
    derniereAnalyse.current = maintenant;

    let pose;
    try {
      pose = modele.detectForVideo(image, maintenant).landmarks[0];
    } catch (cause) {
      console.error('[seance] detection en echec', cause);
      if (boucle.current !== null) cancelAnimationFrame(boucle.current);
      boucle.current = null;
      setErreur('L’analyse de l’image a échoué. Rechargez la page puis réessayez.');
      return;
    }

    // `trace` : ce que l'on dessine. `mesure` : ce qui sert aux angles.
    let trace: PointsProfil | null = null;
    const mesure: PointsProfil = {};
    if (pose) {
      // Le cote filme est celui dont les six points sont le mieux vus.
      const score = (cote: 'gauche' | 'droit') =>
        NOMS_POINTS.reduce(
          (total, nom) => total + (pose[POINTS_COTE[cote][nom]]?.visibility ?? 0),
          0
        );
      const indices = POINTS_COTE[score('gauche') >= score('droit') ? 'gauche' : 'droit'];

      trace = {};
      for (const nom of NOMS_POINTS) {
        const point = pose[indices[nom]];
        if (!point) continue;
        const visibilite = point.visibility ?? 0;
        const enPixels = { x: point.x * image.videoWidth, y: point.y * image.videoHeight };
        if (visibilite >= VISIBILITE_TRACE) trace[nom] = enPixels;
        if (visibilite >= VISIBILITE_MESURE) mesure[nom] = enPixels;
      }
    }

    const angles = calculerAngles(mesure);
    suivi.current.ajouter(maintenant, angles);

    if (!pose) {
      sansPoseDepuis.current ??= maintenant;
      if (maintenant - sansPoseDepuis.current >= DELAI_ALERTE_MS) {
        installationCourante.current = 'personne';
      }
    } else {
      sansPoseDepuis.current = null;
      installationCourante.current =
        Object.keys(angles).length === ARTICULATIONS.length ? 'correcte' : 'partielle';
    }
    dessiner(trace);

    if (maintenant - dernierTexte.current >= PERIODE_TEXTE_MS) {
      dernierTexte.current = maintenant;
      actualiserTexte(maintenant);
    }
  }, [actualiserTexte, dessiner]);

  /** Coupe la camera, libere le fichier, arrete la boucle. Les mesures restent. */
  const arreter = useCallback(() => {
    if (boucle.current !== null) cancelAnimationFrame(boucle.current);
    boucle.current = null;

    flux.current?.getTracks().forEach((piste) => piste.stop());
    flux.current = null;

    const image = video.current;
    if (image) {
      image.pause();
      image.srcObject = null;
      image.removeAttribute('src');
      image.load();
    }
    if (adresseFichier.current) URL.revokeObjectURL(adresseFichier.current);
    adresseFichier.current = null;

    derniereAnalyse.current = 0;
    sansPoseDepuis.current = null;
    installationCourante.current = 'attente';
    dessiner(null);
    setEtat('inactif');
    setSource(null);
    setInstallation('attente');
  }, [dessiner]);

  const demarrer = useCallback(
    async (nouvelleSource: Source, fichier?: File) => {
      arreter();
      setErreur(null);
      setEtat('chargement');
      setSource(nouvelleSource);

      // Une nouvelle prise repart d'une fenetre vide.
      suivi.current.vider();
      valeurs.current = {};
      horsFourchette.current = new Set();
      candidat.current = { cle: null, depuis: 0 };
      setConstats([]);
      setComplet(false);
      setConsigne(null);

      const image = video.current;
      if (!image) return;

      try {
        await obtenirDetecteur();

        if (nouvelleSource === 'camera') {
          flux.current = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          image.srcObject = flux.current;
          image.loop = false;
        } else if (fichier) {
          adresseFichier.current = URL.createObjectURL(fichier);
          image.src = adresseFichier.current;
          image.loop = true;
        }

        await image.play();
        setEtat('actif');
        boucle.current = requestAnimationFrame(analyser);
      } catch (cause) {
        console.error('[seance] demarrage en echec', cause);
        arreter();
        const nom = cause instanceof DOMException ? cause.name : '';
        setErreur(
          nom === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorisez-la dans le navigateur, ou importez une vidéo.'
            : nom === 'NotFoundError'
              ? 'Aucune caméra détectée sur cet appareil. Vous pouvez importer une vidéo.'
              : nom === 'NotReadableError'
                ? 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.'
                : nouvelleSource === 'fichier'
                  ? 'Cette vidéo ne peut pas être lue par le navigateur. Essayez un fichier MP4.'
                  : 'La séance n’a pas pu démarrer. Rechargez la page puis réessayez.'
        );
      }
    },
    [analyser, arreter, obtenirDetecteur]
  );

  // Au demontage : camera coupee et modele libere, quoi qu'il arrive.
  useEffect(() => {
    return () => {
      arreter();
      detecteur.current?.close();
      detecteur.current = null;
    };
  }, [arreter]);

  const enregistrer = () => {
    const jugees = valeurs.current;
    if (!estComplet(jugees)) return;
    setErreur(null);
    demarrerEnvoi(async () => {
      const retour = await actionEnregistrerSeance(contexte.etudeId, jugees);
      if (retour?.erreur) setErreur(retour.erreur);
    });
  };

  const actif = etat === 'actif';
  const manquants = ARTICULATIONS.filter(
    (articulation) => !constats.some((constat) => constat.articulation === articulation)
  );

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
      {/* ------------------------------------------------------------------ */}
      {/* Fenetre video                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="titre-video" className={`${BLOC} p-4 sm:p-5`}>
        <h2 id="titre-video" className={SURTITRE}>
          Vidéo de profil
        </h2>

        <div className="relative mt-4 overflow-hidden rounded-media bg-encre">
          <video
            ref={video}
            muted
            playsInline
            className={`block w-full ${actif ? 'h-auto' : 'aspect-video'}`}
          />
          <canvas
            ref={canvas}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {!actif && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="m-0 max-w-[420px] text-[15px] leading-[1.6] text-white">
                {etat === 'chargement'
                  ? 'Préparation de l’analyse…'
                  : 'Placez la caméra de profil, à hauteur de selle, le cycliste entier dans l’image.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {etat !== 'inactif' ? (
            // Propose aussi pendant le chargement : une source qui ne demarre
            // pas ne doit pas laisser l'ecran sans issue.
            <button type="button" onClick={arreter} className={BOUTON_CONTOUR}>
              <Stop size={17} weight="regular" />
              {actif ? 'Arrêter' : 'Annuler'}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => demarrer('camera')} className={BOUTON_CONTOUR}>
                <Camera size={17} weight="regular" />
                Utiliser la caméra
              </button>
              <button
                type="button"
                onClick={() => champFichier.current?.click()}
                className={BOUTON_CONTOUR}
              >
                <FilmStrip size={17} weight="regular" />
                Importer une vidéo
              </button>
            </>
          )}
          <input
            ref={champFichier}
            type="file"
            accept="video/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Fichier vidéo à analyser"
            onChange={(evenement) => {
              const fichier = evenement.target.files?.[0];
              evenement.target.value = '';
              if (fichier) void demarrer('fichier', fichier);
            }}
          />
          {actif && (
            <p className={MESSAGE_INFO}>
              {source === 'camera' ? 'Caméra en direct.' : 'Lecture en boucle du fichier.'}
            </p>
          )}
        </div>

        <p className="m-0 mt-4 text-[13px] leading-[1.5] text-gris">
          Les images sont analysées dans ce navigateur et ne sont ni envoyées ni enregistrées.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Retours texte                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4">
        <section aria-labelledby="titre-estimations" className={`${BLOC} p-6`}>
          <h2 id="titre-estimations" className={SURTITRE}>
            Estimations d’après les mensurations
          </h2>

          <dl className="m-0 mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[13px] text-texte-doux">Taille de cadre estimée</dt>
              <dd className="m-0 mt-1 font-display text-[30px] leading-none text-encre">
                {contexte.cadre ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-texte-doux">Hauteur de selle indicative</dt>
              <dd className="m-0 mt-1 font-mono text-[19px] font-medium leading-[30px] tabular-nums text-encre">
                {formaterCm(contexte.hauteurSelleCm)}
              </dd>
            </div>
          </dl>

          <p className="m-0 mt-4 text-[13px] leading-[1.5] text-texte-doux">
            Taille {formaterCm(contexte.tailleCm)} · entrejambe {formaterCm(contexte.entrejambeCm)}.
            {contexte.cadre
              ? ' Indication de départ, à confronter à la géométrie du cadre.'
              : ' Saisissez les mensurations pour obtenir ces estimations.'}
          </p>
          {!seance.morphologie && lienFiche && (
            <Link href={lienFiche} className={`${LIEN_ACCENT} mt-3`}>
              Compléter la fiche client
            </Link>
          )}
        </section>

        <section aria-labelledby="titre-mesures" className={`${BLOC} p-6`}>
          <h2 id="titre-mesures" className={SURTITRE}>
            Mesures en direct
          </h2>

          <p
            role="status"
            className={`m-0 mt-4 text-[14px] leading-[1.5] ${
              actif && (installation === 'personne' || installation === 'partielle')
                ? 'font-semibold text-rouge-texte'
                : 'text-texte-doux'
            }`}
          >
            {actif ? MESSAGES_INSTALLATION[installation] : 'Séance à l’arrêt.'}
          </p>

          <table className="mt-4 w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-ligne font-mono text-[11px] uppercase tracking-[.08em] text-gris">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Angle
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Mesure
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Fourchette
                </th>
              </tr>
            </thead>
            <tbody>
              {ARTICULATIONS.map((articulation) => {
                const constat = constats.find((c) => c.articulation === articulation);
                const plage = seance.plages[articulation];
                return (
                  <tr key={articulation} className="border-b border-ligne-douce last:border-b-0">
                    <th scope="row" className="py-3 pr-3 font-semibold text-encre">
                      {LIBELLES_JOINT[articulation]}
                      <span
                        className={`mt-0.5 block text-[12.5px] font-normal ${
                          constat ? TON_STATUT[constat.statut] : 'text-gris'
                        }`}
                      >
                        {constat
                          ? LIBELLES_MESURE[constat.statut]
                          : actif
                            ? `À voir : ${ZONE_REQUISE[articulation]}`
                            : 'En attente'}
                      </span>
                    </th>
                    <td
                      className={`py-3 pr-3 font-mono text-[17px] tabular-nums ${
                        constat?.statut === 'OUT' ? 'font-semibold text-rouge-texte' : 'text-encre'
                      }`}
                    >
                      {constat ? formaterDegres(constat.valeur) : '—'}
                    </td>
                    <td className="py-3 font-mono tabular-nums text-texte">
                      {formaterDegres(plage.min)} à {formaterDegres(plage.max)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="m-0 mt-4 text-[12.5px] leading-[1.5] text-gris">
            Fourchettes{' '}
            {seance.source === 'gemini' ? 'proposées par Gemini' : 'issues de la table Axio'}
            {seance.morphologie
              ? ', ajustées à la taille et à l’entrejambe.'
              : ', sans ajustement morphologique (mensurations incomplètes).'}
          </p>
        </section>

        <section aria-labelledby="titre-consigne" className={`${BLOC} p-6`}>
          <h2 id="titre-consigne" className={SURTITRE}>
            Consigne prioritaire
          </h2>
          <div aria-live="polite" className="mt-4">
            {consigne ? (
              <>
                <p className="m-0 font-mono text-[11px] uppercase tracking-[.08em] text-rouge-texte">
                  {LIBELLES_JOINT[consigne.articulation]}
                </p>
                <p className="m-0 mt-1 text-[15px] leading-[1.6] text-encre">{consigne.consigne}</p>
              </>
            ) : (
              <p className="m-0 text-[14.5px] leading-[1.6] text-texte-doux">
                {constats.length === 0
                  ? 'La première consigne apparaît après quelques tours de pédale.'
                  : complet
                    ? 'Tous les angles sont dans leur fourchette.'
                    : 'Aucun écart sur les angles mesurés pour l’instant.'}
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3">
          {erreur && (
            <p role="alert" className={MESSAGE_ERREUR}>
              {erreur}
            </p>
          )}
          <button
            type="button"
            onClick={enregistrer}
            disabled={!complet || envoi}
            className={BOUTON_PRIMAIRE}
          >
            <FloppyDisk size={18} weight="regular" />
            {envoi ? 'Enregistrement…' : 'Enregistrer la séance'}
          </button>
          {!complet && constats.length > 0 && (
            <p className={MESSAGE_INFO}>
              Il manque encore : {manquants.map((a) => LIBELLES_JOINT[a].toLowerCase()).join(', ')}.
            </p>
          )}
          <p className="m-0 text-[13px] leading-[1.5] text-gris">
            L’enregistrement termine l’étude avec les mesures affichées. Outil d’aide au réglage, ne
            constitue pas un avis médical.
          </p>
        </div>
      </div>
    </div>
  );
}
