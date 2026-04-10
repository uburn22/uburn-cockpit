import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

async function fetchAPI(path: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const from = format(subDays(now, 7), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface PostIdea {
  platform: "instagram" | "tiktok" | "facebook";
  type: "reel" | "carrousel" | "story" | "post" | "tiktok";
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  bestTime: string;
  priority: "high" | "medium" | "low";
}

interface SocialPlan {
  weekOf: string;
  posts: PostIdea[];
  strategy: string;
  keyMetrics: Record<string, unknown>;
}

export async function generatePostSocial(count: number = 7): Promise<{ plan: string; data: SocialPlan }> {
  const [shopifyRaw, adsRaw, ga4Raw] = await Promise.all([
    fetchAPI("/api/shopify"),
    fetchAPI("/api/meta-ads"),
    fetchAPI("/api/ga4"),
  ]);

  const shopify = shopifyRaw as Record<string, unknown>;
  const ads = adsRaw as Record<string, unknown>;
  const ga4 = ga4Raw as Record<string, unknown>;

  const aov = (shopify.aov as number) || 0;
  const totalOrders = (shopify.totalOrders as number) || 0;
  const roas = (ads.blendedRoas as number) || 0;
  const sessions = (ga4.totalSessions as number) || 0;

  // Top products for content
  const products = (shopify.productSplit as Array<{ name: string; revenue: number; orders: number }>) || [];
  const topProduct = products.length > 0 ? products[0].name : "Uburn Classic";

  // Build contextual posts
  const posts: PostIdea[] = [
    {
      platform: "instagram",
      type: "reel",
      caption: `La boisson qui change ta routine matinale 🟣\n\nL'ube, c'est l'ingrédient wellness #1 en Asie. Chez Uburn, on l'a transformé en boisson prête à boire, made in France.\n\n3 bénéfices que tu vas adorer :\n→ Énergie naturelle sans crash\n→ Antioxydants puissants\n→ Un goût qui rend accro\n\nTu testes ? 👇`,
      hashtags: ["#uburn", "#wellness", "#ube", "#boissonbienetre", "#madeinfrance", "#routinematinale", "#healthy", "#antioxydant"],
      hook: "\"Cette boisson violette a changé ma vie\"",
      cta: "Lien en bio — -15% avec UBURN15",
      bestTime: "12h00 ou 18h00",
      priority: "high",
    },
    {
      platform: "tiktok",
      type: "tiktok",
      caption: `POV : tu découvres que l'ube c'est pas juste un truc TikTok 🤯 #uburn #ube #wellness #fyp`,
      hashtags: ["#uburn", "#ube", "#wellness", "#fyp", "#boissonviolette", "#healthy", "#routine"],
      hook: "\"Attends, c'est quoi cette boisson violette ?\"",
      cta: "Lien en bio pour goûter",
      bestTime: "19h00-21h00",
      priority: "high",
    },
    {
      platform: "instagram",
      type: "carrousel",
      caption: `5 raisons de remplacer ton café par Uburn 🟣☕\n\nSwipe pour découvrir pourquoi de plus en plus de français font le switch →`,
      hashtags: ["#uburn", "#café", "#alternative", "#wellness", "#healthy", "#énergie", "#sanscaféine"],
      hook: "\"Ton café te fatigue plus qu'il ne t'éveille\"",
      cta: "Enregistre ce post + teste Uburn",
      bestTime: "08h00 ou 12h00",
      priority: "medium",
    },
    {
      platform: "instagram",
      type: "story",
      caption: `📦 Unboxing time ! Regardez ce packaging 🟣\n\nSondage : Vous avez déjà goûté l'ube ?`,
      hashtags: ["#unboxing", "#uburn"],
      hook: "Sondage interactif + unboxing",
      cta: "Swipe up pour commander",
      bestTime: "10h00",
      priority: "medium",
    },
    {
      platform: "tiktok",
      type: "tiktok",
      caption: `Recette : Smoothie bowl à l'Uburn 🟣🥣 Le plus beau petit-déj que tu verras aujourd'hui #uburn #recette #smoothiebowl #fyp`,
      hashtags: ["#uburn", "#recette", "#smoothiebowl", "#fyp", "#breakfast", "#healthy"],
      hook: "\"Le petit-déj le plus photogénique de ta vie\"",
      cta: "Commande ton pack sur uburn.co",
      bestTime: "07h00 ou 12h00",
      priority: "medium",
    },
    {
      platform: "instagram",
      type: "reel",
      caption: `Mon avis honnête après 30 jours d'Uburn 🟣\n\nJe vous dis tout : goût, énergie, digestion...\n\nVerdicts en fin de vidéo 👀`,
      hashtags: ["#uburn", "#avis", "#test30jours", "#wellness", "#honest", "#review"],
      hook: "\"30 jours d'Uburn — mon corps a changé\"",
      cta: "Le lien est en bio 🔗",
      bestTime: "18h00-20h00",
      priority: "high",
    },
    {
      platform: "facebook",
      type: "post",
      caption: `🟣 Vous connaissez l'ube ?\n\nCet igname violette utilisé depuis des siècles en Asie est un concentré de bienfaits. Chez Uburn, on en a fait une boisson wellness unique, produite en France.\n\n✅ Sans sucres ajoutés\n✅ Riche en antioxydants\n✅ Énergie naturelle\n\nProfitez de -15% sur votre première commande avec le code UBURN15 🎁`,
      hashtags: ["#uburn", "#wellness", "#ube", "#madeinfrance"],
      hook: "\"L'ingrédient secret que l'Asie connaît depuis des siècles\"",
      cta: "Commandez sur uburn.co — livraison offerte dès 2 packs",
      bestTime: "10h00 ou 14h00",
      priority: "low",
    },
  ];

  // Adjust priorities based on performance data
  if (roas < 1.5) {
    // Focus on organic content when ads underperform
    posts.forEach(p => {
      if (p.platform === "tiktok" || p.type === "reel") p.priority = "high";
    });
  }

  const strategy = roas < 1.5
    ? "Focus organique — les ads performent moins bien cette semaine, miser sur le contenu viral TikTok + Reels"
    : roas > 2.5
    ? "Les ads marchent bien — le contenu social doit nourrir le remarketing et la notoriété"
    : "Équilibré — alterner contenu conversion et contenu branding";

  const weekOf = format(new Date(), "'Semaine du' d MMMM yyyy", { locale: fr });

  const data: SocialPlan = {
    weekOf,
    posts: posts.slice(0, count),
    strategy,
    keyMetrics: { roas, aov, totalOrders, sessions, topProduct },
  };

  const plan = `
📱 **PLAN CONTENU SOCIAL UBURN**
📅 ${weekOf}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **STRATÉGIE DE LA SEMAINE**
   ${strategy}

${posts.slice(0, count).map((p, i) => `
📌 **POST ${i + 1}** — ${p.platform.toUpperCase()} ${p.type.toUpperCase()} ${p.priority === "high" ? "🔥" : p.priority === "medium" ? "⭐" : ""}
   🎣 Hook : ${p.hook}
   📝 ${p.caption.split("\n")[0]}...
   #️⃣ ${p.hashtags.slice(0, 4).join(" ")}
   📢 CTA : ${p.cta}
   🕐 Meilleur moment : ${p.bestTime}
`).join("")}

📊 **MÉTRIQUES CLÉ**
   ROAS actuel : ${roas}x | AOV : ${aov.toFixed(0)}€ | Sessions/7j : ${sessions}
   Top produit : ${topProduct}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Plan généré par le Skill Post Social — Cockpit Uburn
`.trim();

  return { plan, data };
}
