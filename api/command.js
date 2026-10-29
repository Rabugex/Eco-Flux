import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido" });
  }

  try {
    let b = req.body || {};
    if (typeof b === "string") {
      try { b = JSON.parse(b); } catch {
        return res.status(400).json({ ok: false, error: "JSON inválido" });
      }
    }

    if (typeof b.pump !== "boolean") {
      return res.status(400).json({ ok: false, error: "Valor da bomba inválido" });
    }
    if (b.mode !== "continuous" && b.mode !== "pulse") {
      return res.status(400).json({ ok: false, error: "Modo inválido" });
    }

    const old = await redis.get("ecoflux:command");
    const command = {
      pump: b.pump,
      mode: b.mode,
      id: (Number(old?.id) || 0) + 1,
      time: Date.now()
    };

    await redis.set("ecoflux:command", command);
    return res.status(200).json({ ok: true, command });
  } catch (error) {
    console.error("Erro em /api/command:", error);
    return res.status(500).json({ ok: false, error: "Erro interno da API" });
  }
}
