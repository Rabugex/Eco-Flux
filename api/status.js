import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

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

    const auth = req.headers.authorization || "";

    /*
      ESP32 envia o status.
    */
    if (req.method === "POST") {
      if (auth !== `Bearer ${deviceToken}`) {
        return res.status(401).json({
          ok: false,
          error: "Não autorizado"
        });
      }

      const body = req.body || {};

      const status = {
        pump: !!body.pump,
        mode: body.mode === "pulse" ? "pulse" : "continuous",
        bucket: Number(body.bucket) || 0,
        batt: Number(body.batt) || 0,
        volt: Number(body.volt) || 0,
        hours: Number(body.hours) || 0,
        online: true,
        time: Date.now()
      };

      await redis.set("ecoflux:status", status);

      return res.status(200).json({
        ok: true
      });
    }

    /*
      Site consulta o status.
    */
    if (req.method === "GET") {
      const status = await redis.get("ecoflux:status");

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

      /*
        Se o ESP32 não envia status há mais de 10 segundos,
        consideramos offline.
      */
      const age = Date.now() - Number(status.time || 0);

      if (age > 10000) {
        status.online = false;
      } else {
        status.online = true;
      }

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
      error: "Erro interno"
    });
  }
}
