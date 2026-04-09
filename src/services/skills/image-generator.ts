/**
 * Skill: Image Generator (Replicate AI)
 *
 * Génère des images IA via Replicate API — exactement comme dans
 * la vidéo de Grace Leung.
 *
 * Modèle: FLUX.1 Schnell (rapide) ou FLUX.1 Pro (haute qualité)
 *
 * Cas d'usage :
 * - Visuels publicitaires Meta Ads
 * - Images produit lifestyle
 * - Visuels pour posts Instagram/TikTok
 * - Bannières site web / landing pages
 * - Infographies et illustrations
 */

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// ── Types ───────────────────────────────────────────────
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: "product" | "lifestyle" | "ugc" | "minimal" | "bold" | "infographic";
  format?: "story" | "feed" | "square" | "landscape";
}

export interface GeneratedImage {
  id: string;
  url: string | null;
  prompt: string;
  status: "success" | "error" | "mock";
  format: string;
  dimensions: { width: number; height: number };
}

// ── Format dimensions ───────────────────────────────────
const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 628 },
};

// ── Style enhancers ─────────────────────────────────────
const STYLE_ENHANCERS: Record<string, string> = {
  product: "professional product photography, studio lighting, clean background, premium feel, commercial quality",
  lifestyle: "lifestyle photography, natural lighting, warm tones, authentic, editorial style",
  ugc: "user-generated content style, iPhone photo, authentic, casual, relatable, social media",
  minimal: "minimalist design, clean, white space, modern, elegant typography",
  bold: "bold colors, high contrast, eye-catching, dynamic composition, vibrant",
  infographic: "clean infographic style, data visualization, icons, flat design, professional",
};

// ── Uburn brand context ─────────────────────────────────
const UBURN_BRAND_CONTEXT = "purple ube drink, wellness beverage, French brand, violet/purple color (#6B21A8), gold accents (#C9A84C), black background, premium healthy drink, glass bottle";

// ── Generate single image ───────────────────────────────
export async function generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
  const format = request.format || "square";
  const dims = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS.square;
  const width = request.width || dims.width;
  const height = request.height || dims.height;

  const styleEnhancer = request.style ? STYLE_ENHANCERS[request.style] : "";
  const fullPrompt = `${request.prompt}. ${styleEnhancer}. Brand context: ${UBURN_BRAND_CONTEXT}`;
  const negativePrompt = request.negativePrompt || "blurry, low quality, distorted, ugly, bad anatomy, watermark, text overlay, stock photo feel";

  if (!process.env.REPLICATE_API_TOKEN) {
    // Mock mode for development
    return {
      id: `mock_${Date.now()}`,
      url: null,
      prompt: fullPrompt,
      status: "mock",
      format,
      dimensions: { width, height },
    };
  }

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro",
      {
        input: {
          prompt: fullPrompt,
          negative_prompt: negativePrompt,
          width,
          height,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        },
      }
    );

    // Replicate returns an array of URLs or a single URL
    const imageUrl = Array.isArray(output) ? String(output[0]) : String(output);

    return {
      id: `repl_${Date.now()}`,
      url: typeof imageUrl === "string" ? imageUrl : null,
      prompt: fullPrompt,
      status: "success",
      format,
      dimensions: { width, height },
    };
  } catch (err) {
    console.error("Replicate image generation error:", err);
    return {
      id: `err_${Date.now()}`,
      url: null,
      prompt: fullPrompt,
      status: "error",
      format,
      dimensions: { width, height },
    };
  }
}

// ── Generate batch of ad images ─────────────────────────
export interface AdImageBatch {
  images: GeneratedImage[];
  totalGenerated: number;
  replicateConnected: boolean;
}

export async function generateAdImages(count: number = 4): Promise<AdImageBatch> {
  const adPrompts: ImageGenerationRequest[] = [
    {
      prompt: "A beautiful purple ube wellness drink in a sleek glass bottle, held by a young woman in a bright modern kitchen, morning sunlight streaming through windows",
      style: "lifestyle",
      format: "story",
    },
    {
      prompt: "Premium purple ube drink bottle centered on a dark marble surface with golden accents, dramatic studio lighting, luxury wellness brand aesthetic",
      style: "product",
      format: "feed",
    },
    {
      prompt: "Flat lay of purple ube drink next to fresh fruits, acai bowl, and yoga mat, wellness morning routine setup, Instagram aesthetic",
      style: "lifestyle",
      format: "square",
    },
    {
      prompt: "A vibrant purple smoothie bowl made with ube drink, topped with granola and berries, rustic wooden table, overhead shot, food photography",
      style: "lifestyle",
      format: "square",
    },
    {
      prompt: "Young athletic woman drinking purple ube beverage after workout in a modern gym, natural sweat, authentic UGC style photo",
      style: "ugc",
      format: "story",
    },
    {
      prompt: "Three purple ube drink bottles arranged artistically with tropical flowers and gold geometric shapes, premium brand campaign shot",
      style: "product",
      format: "landscape",
    },
    {
      prompt: "Close-up of pouring purple ube drink into a glass with ice, beautiful purple liquid splash, slow motion feel, dark background with golden rim light",
      style: "bold",
      format: "feed",
    },
    {
      prompt: "Before and after comparison layout: left side grey tired coffee cup, right side vibrant purple ube drink with energy glow, split composition",
      style: "bold",
      format: "story",
    },
  ];

  const selectedPrompts = adPrompts.slice(0, count);
  const images: GeneratedImage[] = [];

  for (const prompt of selectedPrompts) {
    const image = await generateImage(prompt);
    images.push(image);
  }

  return {
    images,
    totalGenerated: images.length,
    replicateConnected: !!process.env.REPLICATE_API_TOKEN,
  };
}

// ── Generate social media images ────────────────────────
export async function generateSocialImages(count: number = 3): Promise<AdImageBatch> {
  const socialPrompts: ImageGenerationRequest[] = [
    {
      prompt: "Aesthetic flat lay with purple ube drink, a book, sunglasses, and a straw hat on a beach towel, summer vibes, Instagram mood",
      style: "lifestyle",
      format: "square",
    },
    {
      prompt: "Minimalist purple ube drink bottle on white background with clean sans-serif text space, modern brand post template",
      style: "minimal",
      format: "square",
    },
    {
      prompt: "Group of diverse young friends cheering with purple ube drinks at a rooftop party, golden hour light, candid photo style",
      style: "ugc",
      format: "feed",
    },
  ];

  const selectedPrompts = socialPrompts.slice(0, count);
  const images: GeneratedImage[] = [];

  for (const prompt of selectedPrompts) {
    const image = await generateImage(prompt);
    images.push(image);
  }

  return {
    images,
    totalGenerated: images.length,
    replicateConnected: !!process.env.REPLICATE_API_TOKEN,
  };
}
