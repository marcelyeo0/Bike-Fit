import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-9 bg-white px-6 py-12">
      {/*
        Rendu cote serveur, sans condition. Le formulaire Clerk, lui, est monte
        cote client depuis le CDN Clerk : le HTML servi n'en contient rien. Sans
        ce mot-marque, un script lent ou bloque donne une page entierement
        blanche. `ClerkLoading` ne reglerait pas le probleme — ces composants de
        controle ne rendent rien au serveur (verifie : 0 occurrence dans le HTML).
      */}
      <p className="m-0 font-display text-2xl tracking-[.06em] text-encre">AXIO</p>
      <SignIn />
    </div>
  );
}
