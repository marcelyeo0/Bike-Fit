import React from 'react';

/**
 * Redesign : les trois maquettes en <div> du canvas (camera, cercle, feuille)
 * sont remplacees par de vraies photos. Le rythme vertical decale remplace la
 * numerotation 01 / 02 / 03, et la duree sous chaque titre porte l'information
 * que le numero ne portait pas.
 */
const ETAPES = [
  {
    image: 'etape-film.jpg',
    alt: "Client filme de profil sur un home-trainer, smartphone pose sur un trepied dans un atelier clair",
    titre: 'Filmez votre client',
    duree: '30 secondes de pédalage',
    texte:
      'Quelques secondes de pédalage de profil sur le home-trainer. Une simple webcam suffit.',
    decalage: 'md:mt-0',
  },
  {
    image: 'etape-analyse.jpg',
    alt: "Ordinateur portable affichant un cycliste de profil avec les articulations reperees en rouge",
    titre: 'Laissez Axio mesurer',
    duree: '2 minutes de traitement',
    texte:
      'Les angles articulaires sont mesurés image par image, puis comparés aux plages recommandées.',
    decalage: 'md:mt-12',
  },
  {
    image: 'etape-rapport.jpg',
    alt: "Vendeur remettant un rapport imprime a un client au comptoir d'un magasin de velo",
    titre: 'Remettez le rapport',
    duree: 'En fin de rendez-vous',
    texte: 'Un PDF à votre marque, prêt à donner au client avant qu’il ne quitte le magasin.',
    decalage: 'md:mt-24',
  },
];

export default function Comment() {
  return (
    <section id="comment" className="mx-auto max-w-page px-7 pb-10 pt-[130px]">
      <div className="a-reveler mb-[70px] max-w-[640px]">
        <h2 className="m-0 font-display text-titre text-encre">
          Comment ça
          <br />
          marche
        </h2>
        <p className="mt-6 max-w-[46ch] text-[16.5px] leading-[1.6] text-texte-doux">
          Trois étapes, une quinzaine de minutes par client. Aucune formation technique nécessaire.
        </p>
      </div>

      <ol className="m-0 grid list-none grid-cols-1 gap-10 p-0 md:grid-cols-3 md:gap-9">
        {ETAPES.map((etape, i) => (
          <li
            key={etape.titre}
            data-reveal-index={i}
            className={`a-reveler flex flex-col ${etape.decalage}`}
          >
            <div className="aspect-[4/3] overflow-hidden rounded-media border border-ligne bg-fond-doux">
              <img
                src={`/assets/${etape.image}`}
                alt={etape.alt}
                width="1024"
                height="768"
                loading="lazy"
                decoding="async"
                data-parallax={0.05 + i * 0.03}
                className="block h-full w-full scale-[1.12] object-cover"
              />
            </div>
            <h3 className="mb-0 mt-7 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-encre">
              {etape.titre}
            </h3>
            <p className="mb-0 mt-2 text-[15px] font-semibold text-rouge-texte">{etape.duree}</p>
            <p className="mb-0 mt-4 text-base leading-[1.6] text-texte-doux">{etape.texte}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
