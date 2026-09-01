import React from 'react';

export default function Temoignage() {
  return (
    <section className="mx-auto max-w-[1000px] px-7 pb-[150px] text-center">
      <figure className="a-reveler m-0">
        <span aria-hidden="true" className="block h-[70px] font-display text-[110px] leading-[.6] text-rouge">
          «
        </span>
        <blockquote className="m-0">
          <p className="mx-auto mb-10 max-w-[820px] font-condensed text-[clamp(24px,3.4vw,40px)] font-semibold leading-[1.24] text-encre [text-wrap:pretty]">
            Je facture le bike fit 120 € et je le rentabilise en trois rendez-vous. Avant Axio,
            j'envoyais ces clients ailleurs.
          </p>
        </blockquote>
        <figcaption className="flex items-center justify-center gap-4">
          <img
            src="/assets/portrait.png"
            alt="Julien Marchand"
            width="64"
            height="64"
            loading="lazy"
            decoding="async"
            className="h-16 w-16 rounded-full border border-[#E6E6E6] object-cover"
          />
          <span className="text-left">
            <span className="block text-base font-semibold text-encre">Julien Marchand</span>
            <span className="block text-[14.5px] text-gris">Atelier 14, Lyon</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
