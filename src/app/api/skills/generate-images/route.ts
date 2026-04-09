import { NextRequest, NextResponse } from "next/server";
import { generateAdImages, generateSocialImages, generateImage } from "@/services/skills/image-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, count, prompt, style, format } = body as {
      type?: "ads" | "social" | "custom";
      count?: number;
      prompt?: string;
      style?: "product" | "lifestyle" | "ugc" | "minimal" | "bold" | "infographic";
      format?: "story" | "feed" | "square" | "landscape";
    };

    if (type === "custom" && prompt) {
      const image = await generateImage({ prompt, style, format });
      return NextResponse.json({ images: [image], totalGenerated: 1, replicateConnected: !!process.env.REPLICATE_API_TOKEN });
    }

    if (type === "social") {
      const result = await generateSocialImages(count || 3);
      return NextResponse.json(result);
    }

    // Default: ad images
    const result = await generateAdImages(count || 4);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
