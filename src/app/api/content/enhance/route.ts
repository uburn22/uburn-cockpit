import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/content/enhance
 *
 * Workflow : Upload → IA améliore → tu valides → publie
 *
 * Prend du contenu brut (caption, image, type) et retourne
 * des suggestions IA : meilleure caption, hashtags, CTA, meilleur horaire.
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caption, type, platform, format } = body;

    if (!caption && !type) {
      return NextResponse.json({ error: "Caption ou type requis" }, { status: 400 });
    }

    const prompt = `Tu es un expert social media pour Uburn, une boisson wellness française à base d'ube (igname violette des Philippines).
Couleurs de marque : violet #6B21A8, or #C9A84C, noir #0A0A0A.

Le contenu suivant a été créé manuellement. Améliore-le pour maximiser l'engagement.

Type : ${type || "instagram_post"}
Plateforme : ${platform || "instagram"}
Format : ${format || "feed"}
Caption originale : ${caption || "(aucune caption fournie)"}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "enhanced_caption": "Caption améliorée avec emojis et structure engageante",
  "hook": "Accroche percutante (première ligne)",
  "cta": "Call-to-action",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"],
  "best_time": "Meilleur horaire pour poster (ex: Mardi 18h30)",
  "tips": ["Conseil 1 pour améliorer le post", "Conseil 2"],
  "engagement_score": 8,
  "improvements": ["Ce qui a été amélioré et pourquoi"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "{}";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Réponse IA invalide" }, { status: 500 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
