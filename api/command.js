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
        error: "ECOFLUX_DEVICE_TOKEN não configurado na Vercel"
      });
    }

    /*
      ESP32:
      usa Authorization: Bearer TOKEN
      para ler os comandos.
    */
    const auth = req.headers.authorization || "";

    if (auth === `Bearer ${deviceToken}`) {
      const command = await redis.get("ecoflux:command");

      return res.status(200).json({
        ok: true,
        command: command || {
          pump: false,
          mode: "continuous",
          id: 0
        }
      });
    }

    /*
      Site:
      envia comandos para o ESP32.
    */
    if (req.method === "POST") {
      const body = req.body || {};

      if (
        typeof body.pump !== "boolean" ||
        (body.mode !== "continuous" && body.mode !== "pulse")
      ) {
        return res.status(400).json({
          ok: false,
          error: "Comando inválido"
        });
      }

      const oldCommand = await redis.get("ecoflux:command");

      const id =
        oldCommand && typeof oldCommand.id === "number"
          ? oldCommand.id + 1
          : 1;

      const command = {
        pump: body.pump,
        mode: body.mode,
        id,
        time: Date.now()
      };

      await redis.set("ecoflux:command", command);

      return res.status(200).json({
        ok: true,
        command
      });
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
