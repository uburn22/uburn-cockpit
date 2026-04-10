import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

async function fetchAPI(path: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const from = format(subDays(now, 30), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface EmailStep {
  delay: string;
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  ctaUrl: string;
}

interface EmailSequenceData {
  type: "abandon" | "welcome" | "winback" | "vip" | "post-purchase";
  name: string;
  trigger: string;
  steps: EmailStep[];
  expectedImpact: string;
  metrics: Record<string, unknown>;
}

export async function generateEmailSequence(
  type: "abandon" | "welcome" | "winback" | "vip" | "post-purchase" = "abandon"
): Promise<{ sequence: string; data: EmailSequenceData }> {
  const [shopifyRaw] = await Promise.all([fetchAPI("/api/shopify")]);
  const shopify = shopifyRaw as Record<string, unknown>;

  const aov = (shopify.aov as number) || 35;
  const totalOrders = (shopify.totalOrders as number) || 0;
  const products = (shopify.productSplit as Array<{ name: string; revenue: number }>) || [];
  const topProduct = products.length > 0 ? products[0].name : "Pack Découverte Uburn";

  const sequences: Record<string, EmailSequenceData> = {
    abandon: {
      type: "abandon",
      name: "Séquence Panier Abandonné",
      trigger: "Client ajoute au panier mais ne finalise pas — déclenché après 1h",
      steps: [
        {
          delay: "+1h",
          subject: "Oops, tu as oublié quelque chose 🟣",
          preheader: "Ton Uburn t'attend encore...",
          body: `Salut {{prénom}},\n\nOn a remarqué que tu avais laissé ton {{produit}} dans ton panier.\n\nOn comprend, parfois on hésite ! Mais voici 3 raisons de craquer :\n\n→ Énergie naturelle sans crash\n→ Goût unique à l'ube\n→ Livraison rapide partout en France\n\nTon panier est encore sauvegardé — il suffit d'un clic 👇`,
          cta: "Finaliser ma commande",
          ctaUrl: "{{checkout_url}}",
        },
        {
          delay: "+24h",
          subject: "⏰ Ton panier expire bientôt",
          preheader: "Dernière chance avant qu'on libère ton stock",
          body: `Hey {{prénom}},\n\nTon {{produit}} est toujours dans ton panier, mais on ne peut pas le réserver indéfiniment.\n\nPour te motiver, voici un code -10% : REVIENS10\n\nValable 48h seulement.`,
          cta: "Utiliser mon code -10%",
          ctaUrl: "{{checkout_url}}?discount=REVIENS10",
        },
        {
          delay: "+72h",
          subject: "Dernière chance : -15% sur ton panier 🎁",
          preheader: "Notre meilleure offre pour toi",
          body: `{{prénom}},\n\nC'est notre dernier message.\n\nOn veut vraiment que tu puisses goûter Uburn, alors voici notre meilleure offre : -15% avec le code DERNIERECHANCE.\n\nAprès ça, ton panier sera vidé et l'offre ne sera plus disponible.\n\nÀ toi de jouer 💜`,
          cta: "J'en profite — -15%",
          ctaUrl: "{{checkout_url}}?discount=DERNIERECHANCE",
        },
      ],
      expectedImpact: `Récupération estimée : ${Math.round(totalOrders * 0.7 * 0.1)} commandes/mois (10% des paniers abandonnés)`,
      metrics: { aov, estimatedAbandoned: Math.round(totalOrders * 0.7), recoveryRate: "8-12%" },
    },

    welcome: {
      type: "welcome",
      name: "Séquence Bienvenue (Premier Achat)",
      trigger: "Première commande confirmée",
      steps: [
        {
          delay: "+0h",
          subject: "Bienvenue dans la famille Uburn ! 🟣",
          preheader: "Merci pour ta confiance",
          body: `Hey {{prénom}} !\n\nMerci pour ta première commande ! Tu fais maintenant partie de la communauté Uburn 💜\n\nVoici ce qui t'attend :\n→ Ta commande est en préparation\n→ Tu recevras un email de suivi dès l'expédition\n→ Livraison estimée en 2-3 jours\n\nEn attendant, suis-nous sur Instagram pour découvrir des recettes exclusives !`,
          cta: "Suivre @uburn sur Instagram",
          ctaUrl: "https://instagram.com/uburn",
        },
        {
          delay: "+3j",
          subject: "Comment préparer ton Uburn ? 🥤",
          preheader: "3 façons de le déguster",
          body: `{{prénom}},\n\nTon Uburn devrait être arrivé (ou presque) !\n\nVoici nos 3 façons préférées de le déguster :\n\n1. 🧊 Glacé — versé sur des glaçons, le classique\n2. 🥣 Smoothie bowl — mixé avec une banane et du granola\n3. ☕ Uburn Latte — chauffé avec un nuage de lait d'avoine\n\nPartage ta recette préférée sur Insta avec #MyUburn !`,
          cta: "Découvrir plus de recettes",
          ctaUrl: "https://uburn.co/recettes",
        },
        {
          delay: "+7j",
          subject: "Ton avis compte pour nous ⭐",
          preheader: "30 secondes pour nous aider",
          body: `Hey {{prénom}},\n\nÇa fait une semaine que tu as reçu ton Uburn !\n\nOn aimerait beaucoup avoir ton retour :\n→ Tu as aimé le goût ?\n→ Tu sens une différence dans ton énergie ?\n\nLaisse-nous un avis et reçois -10% sur ta prochaine commande 🎁`,
          cta: "Laisser mon avis",
          ctaUrl: "https://uburn.co/avis",
        },
        {
          delay: "+14j",
          subject: "Tu es presque en rupture 😱",
          preheader: "Restock avant de manquer",
          body: `{{prénom}},\n\nSi tu bois un Uburn par jour (comme nous 😄), ton stock doit baisser !\n\nRecommande maintenant et profite de -10% fidélité avec le code RESTOCK10.\n\nLivraison en 48h 🚀`,
          cta: "Recommander — -10%",
          ctaUrl: "https://uburn.co/shop?discount=RESTOCK10",
        },
      ],
      expectedImpact: "Taux de repeat estimé : +25% sur 30 jours",
      metrics: { aov, topProduct },
    },

    winback: {
      type: "winback",
      name: "Séquence Réactivation (Clients Inactifs)",
      trigger: "Aucun achat depuis 30+ jours",
      steps: [
        {
          delay: "+30j",
          subject: "Tu nous manques, {{prénom}} 💜",
          preheader: "On a des nouvelles pour toi",
          body: `Hey {{prénom}},\n\nÇa fait un moment qu'on ne t'a pas vu chez Uburn !\n\nDepuis ta dernière commande, on a :\n→ Lancé de nouvelles saveurs\n→ Amélioré notre emballage\n→ Préparé une offre spéciale pour toi\n\nCode -20% : COMEBACK20 — valable 72h`,
          cta: "Revenir avec -20%",
          ctaUrl: "https://uburn.co/shop?discount=COMEBACK20",
        },
        {
          delay: "+45j",
          subject: "Dernière offre spéciale avant qu'on te laisse tranquille 👋",
          preheader: "Notre meilleur deal, juste pour toi",
          body: `{{prénom}},\n\nC'est notre dernier message.\n\nOn ne veut pas te spammer, mais on voulait te proposer une dernière offre : -25% + livraison gratuite avec LASTCHANCE.\n\nSi tu ne souhaites plus recevoir nos emails, pas de souci — tu peux te désabonner en bas.`,
          cta: "Profiter de -25% + livraison gratuite",
          ctaUrl: "https://uburn.co/shop?discount=LASTCHANCE",
        },
      ],
      expectedImpact: "Réactivation estimée : 5-10% des clients inactifs",
      metrics: { aov },
    },

    vip: {
      type: "vip",
      name: "Séquence VIP (Clients Fidèles)",
      trigger: "3ème commande ou plus",
      steps: [
        {
          delay: "+0h",
          subject: "🏆 Tu es maintenant VIP Uburn !",
          preheader: "Merci pour ta fidélité — avantages exclusifs inside",
          body: `{{prénom}},\n\nWow, ta ${"{"}{"{"}}nème_commande{{"}"}{"}"} commande ! Tu fais partie de nos meilleurs clients 💜\n\nEn tant que VIP Uburn, tu bénéficies de :\n→ -15% permanent avec le code VIP15\n→ Accès early aux nouvelles saveurs\n→ Livraison gratuite à vie\n→ Invitation aux événements Uburn\n\nMerci de faire partie de l'aventure !`,
          cta: "Shopper en VIP",
          ctaUrl: "https://uburn.co/vip",
        },
      ],
      expectedImpact: "LTV x2 sur les clients VIP vs clients normaux",
      metrics: { aov },
    },

    "post-purchase": {
      type: "post-purchase",
      name: "Séquence Post-Achat (Suivi)",
      trigger: "Commande expédiée",
      steps: [
        {
          delay: "+0h",
          subject: "📦 Ton Uburn est en route !",
          preheader: "Suivi de livraison inside",
          body: `{{prénom}},\n\nBonne nouvelle ! Ta commande #{{order_number}} a été expédiée 🚀\n\nSuivi : {{tracking_url}}\nLivraison estimée : {{estimated_delivery}}\n\nEn attendant, suis-nous sur Instagram @uburn pour ne rien rater !`,
          cta: "Suivre mon colis",
          ctaUrl: "{{tracking_url}}",
        },
        {
          delay: "+5j",
          subject: "Tout s'est bien passé ? 📬",
          preheader: "On veut s'assurer que tu es satisfait(e)",
          body: `Hey {{prénom}},\n\nTu as bien reçu ta commande ?\n\nSi tout est OK, on serait ravis d'avoir ton avis ⭐\nSi quelque chose ne va pas, réponds à cet email et on s'en occupe immédiatement.\n\nLa satisfaction client, c'est notre priorité #1.`,
          cta: "Laisser un avis",
          ctaUrl: "https://uburn.co/avis",
        },
      ],
      expectedImpact: "Réduction des tickets SAV de 30% + augmentation des avis positifs",
      metrics: { aov },
    },
  };

  const seq = sequences[type];

  const sequence = `
✉️ **${seq.name.toUpperCase()}**
📅 ${format(new Date(), "d MMMM yyyy", { locale: fr })}
🎯 Trigger : ${seq.trigger}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${seq.steps.map((step, i) => `
📧 **EMAIL ${i + 1}** — Envoi : ${step.delay}
   📌 Objet : ${step.subject}
   📝 Pré-header : ${step.preheader}

   ${step.body.split("\n").map(l => `   ${l}`).join("\n")}

   🔘 CTA : ${step.cta}
   🔗 ${step.ctaUrl}
`).join("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")}

📊 **IMPACT ATTENDU**
   ${seq.expectedImpact}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Séquence générée par le Skill Email — Cockpit Uburn
`.trim();

  return { sequence, data: seq };
}
