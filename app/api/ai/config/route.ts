import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { generateWithProvider } from "@/lib/ai-providers";
import { AiProvider } from "@/lib/ai-provider-constants";

// GET: Return current provider config (masked key)
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const config = await prisma.userAiConfig.findUnique({
    where: { userId: user.id },
  });

  if (!config) {
    return Response.json({ configured: false, provider: null, maskedKey: null });
  }

  // Mask key: show only last 4 chars
  let maskedKey = "••••••••";
  try {
    const decrypted = decryptApiKey(config.apiKey);
    maskedKey = "••••••••" + decrypted.slice(-4);
  } catch {
    // If decryption fails, just show masked
  }

  return Response.json({
    configured: true,
    provider: config.provider,
    maskedKey,
    updatedAt: config.updatedAt,
  });
}

// POST: Validate and save provider + API key
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { provider, apiKey } = await request.json() as { provider: AiProvider; apiKey: string };

  if (!provider || !apiKey) {
    return Response.json({ error: "Provider and API key are required" }, { status: 400 });
  }

  // Validate key with a test call
  try {
    await generateWithProvider("Say 'OK' in one word.", provider, apiKey);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid API key";
    return Response.json({ error: `Key validation failed: ${message}` }, { status: 400 });
  }

  // Encrypt and save
  const encrypted = encryptApiKey(apiKey);
  await prisma.userAiConfig.upsert({
    where: { userId: user.id },
    update: { provider, apiKey: encrypted },
    create: { userId: user.id, provider, apiKey: encrypted },
  });

  return Response.json({ success: true, provider });
}

// DELETE: Remove user's config (reverts to server default)
export async function DELETE() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  await prisma.userAiConfig.deleteMany({ where: { userId: user.id } });
  return Response.json({ success: true });
}
