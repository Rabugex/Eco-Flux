import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const deviceToken = process.env.ECOFLUX_DEVICE_TOKEN;

    if (!deviceToken) {
      return res.status(500).json({
        ok: false,
        error: "ECOFLUX_DEVICE_TOKEN não configurado"
      });
    }

    const authorization = req.headers.authorization || "";

    /*
     * =====================================================
     * ESP32 ENVIANDO STATUS
     * =====================================================
     */

    if (req.method === "POST") {

      if (authorization !== `Bearer ${deviceToken}`) {
        return res.status(401).json({
          ok: false,
          error: "Não autorizado"
        });
      }

      const body = req.body || {};

      const status = {
        pump: !!body.pump,

        mode:
          body.mode === "pulse"
            ? "pulse"
            : "continuous",

        bucket:
          Number(body.bucket) || 0,

        batt:
          Number(body.batt) || 0,

        volt:
          Number(body.volt) || 0,

        hours:
          Number(body.hours) || 0,

        online: true,

        time: Date.now()
      };

      await redis.set(
        "ecoflux:status",
        status
      );

      return res.status(200).json({
        ok: true
      });
    }

    /*
     * =====================================================
     * SITE CONSULTANDO STATUS
     * =====================================================
     */

    if (req.method === "GET") {

      let status =
        await redis.get("ecoflux:status");

      if (!status) {

        return res.status(200).json({
          ok: true,
          online: false,
          pump: false,
          mode: "continuous",
          bucket: 0,
          batt: 0,
          volt: 0,
          hours: 0
        });
      }

      const age =
        Date.now() -
        Number(status.time || 0);

      status.online =
        age <= 10000;

      return res.status(200).json(status);
    }

    return res.status(405).json({
      ok: false,
      error: "Método não permitido"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Erro interno da API"
    });
  }
}
