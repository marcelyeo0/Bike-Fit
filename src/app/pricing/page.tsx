import { redirect } from 'next/navigation';

/**
 * `/pricing` est la cible des appels a l'abonnement du dashboard. La grille
 * tarifaire vit aujourd'hui dans la section `#tarifs` de la landing : cette
 * route redirige plutot que de dupliquer les prix a deux endroits.
 *
 * Le jour ou une vraie page tarifaire existe, elle remplace ce fichier sans
 * qu'aucun lien du dashboard ne bouge.
 */
export default function PricingPage() {
  redirect('/#tarifs');
}
