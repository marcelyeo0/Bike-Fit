import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-9 bg-white px-6 py-12">
      {/* Meme garde-fou que sur /sign-in : voir le commentaire la-bas. */}
      <p className="m-0 font-display text-2xl tracking-[.06em] text-encre">AXIO</p>
      <SignUp />
    </div>
  );
}
