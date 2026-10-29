import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    // ESP32: envia telemetria e recebe o comando atual na mesma resposta
    if (req.method === "POST") {
      const token = process.env.ECOFLUX_DEVICE_TOKEN;
      if (!token || req.headers.authorization !== `Bearer ${token}`) {
        return res.status(401).json({ ok: false, error: "Não autorizado" });
      }

      let b = req.body || {};
      if (typeof b === "string") {
        try { b = JSON.parse(b); } catch {
          return res.status(400).json({ ok: false, error: "JSON inválido" });
        }
      }

      const status = {
        pump: b.pump === true || b.pump === 1,
        mode: b.mode === "pulse" ? "pulse" : "continuous",
        bucket: num(b.bucket, -1),
        batt: num(b.batt),
        volt: num(b.volt),
        hours: num(b.hours),
        time: Date.now()
      };

      const [, command] = await Promise.all([
        redis.set("ecoflux:status", status, { ex: 30 }),
        redis.get("ecoflux:command")
      ]);

      return res.status(200).json({
        ok: true,
        command: command || { pump: false, mode: "continuous", id: 0, time: 0 }
      });
    }

    // Site: consulta telemetria
    if (req.method === "GET") {
      const s = await redis.get("ecoflux:status");
      if (!s) {
        return res.status(200).json({
          ok: true, online: false, pump: false, mode: "continuous",
          bucket: 0, batt: 0, volt: 0, hours: 0
        });
      }
      return res.status(200).json({ ...s, online: Date.now() - num(s.time) <= 15000 });
    }

    return res.status(405).json({ ok: false, error: "Método não permitido" });
  } catch (error) {
    console.error("Erro em /api/status:", error);
    return res.status(500).json({ ok: false, error: "Erro interno da API" });
  }
}
