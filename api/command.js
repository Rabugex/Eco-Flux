import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const COMMAND_KEY = "ecoflux:command";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
     * ESP32 CONSULTA COMANDOS
     * =====================================================
     */

    if (req.method === "GET") {

      if (
        authorization !==
        `Bearer ${deviceToken}`
      ) {
        return res.status(401).json({
          ok: false,
          error: "Não autorizado"
        });
      }

      let command =
        await redis.get(COMMAND_KEY);

      if (!command) {
        command = {
          pump: false,
          mode: "continuous",
          id: 0,
          time: 0
        };
      }

      return res.status(200).json({
        ok: true,
        command
      });
    }

    /*
     * =====================================================
     * SITE ENVIA COMANDO
     * =====================================================
     */

    if (req.method === "POST") {

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

      if (
        typeof body.pump !== "boolean"
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Valor da bomba inválido"
        });
      }

      if (
        body.mode !== "continuous" &&
        body.mode !== "pulse"
      ) {
        return res.status(400).json({
          ok: false,
          error: "Modo inválido"
        });
      }

      let oldCommand =
        await redis.get(COMMAND_KEY);

      let id = 1;

      if (
        oldCommand &&
        typeof oldCommand.id === "number"
      ) {
        id = oldCommand.id + 1;
      }

      const command = {
        pump: body.pump,
        mode: body.mode,
        id,
        time: Date.now()
      };

      await redis.set(
        COMMAND_KEY,
        command,
        {
          ex: 60
        }
      );

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

    console.error(
      "Erro em /api/command:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Erro interno da API"
    });
  }
}
