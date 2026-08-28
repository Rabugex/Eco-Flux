import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const STATUS_KEY = "ecoflux:status";

export default async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {

    const deviceToken =
      process.env.ECOFLUX_DEVICE_TOKEN;

    if (!deviceToken) {
      return res.status(500).json({
        ok: false,
        error:
          "ECOFLUX_DEVICE_TOKEN não configurado"
      });
    }

    const authorization =
      req.headers.authorization || "";

    /*
     * =====================================================
     * ESP32 ENVIA TELEMETRIA
     * =====================================================
     */

    if (req.method === "POST") {

      if (
        authorization !==
        `Bearer ${deviceToken}`
      ) {
        return res.status(401).json({
          ok: false,
          error: "Não autorizado"
        });
      }

      let body = req.body || {};

      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({
            ok: false,
            error: "JSON inválido"
          });
        }
      }

      const status = {

        pump:
          body.pump === true ||
          body.pump === 1,

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
        STATUS_KEY,
        status,
        {
          ex: 20
        }
      );

      return res.status(200).json({
        ok: true
      });
    }

    /*
     * =====================================================
     * SITE CONSULTA TELEMETRIA
     * =====================================================
     */

    if (req.method === "GET") {

      let status =
        await redis.get(STATUS_KEY);

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

    console.error(
      "Erro em /api/status:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Erro interno da API"
    });
  }
}
