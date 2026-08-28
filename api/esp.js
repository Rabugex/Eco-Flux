const STATE_KEY = "ecoflux:state";
const COMMAND_KEY = "ecoflux:command";

const DEVICE_KEY = process.env.ECOFLUX_DEVICE_KEY || "ecoflux-esp32-2026";

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Key",
    "Content-Type": "application/json"
  };
}

async function redis(command, args = []) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash não configurado");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command, ...args])
  });

  if (!response.ok) {
    throw new Error("Erro no Upstash: " + response.status);
  }

  const data = await response.json();
  return data.result;
}

async function getState() {
  const raw = await redis("GET", [STATE_KEY]);

  if (!raw) {
    return {
      pump: false,
      mode: "continuous",
      bucket: 18,
      battery: 86,
      voltage: 12.4,
      hours: 0,
      online: false,
      updated: 0
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      pump: false,
      mode: "continuous",
      bucket: 18,
      battery: 86,
      voltage: 12.4,
      hours: 0,
      online: false,
      updated: 0
    };
  }
}

async function saveState(state) {
  await redis("SET", [
    STATE_KEY,
    JSON.stringify(state)
  ]);
}

export default async function handler(req, res) {
  const h = headers();

  Object.entries(h).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    /*
     * =========================================================
     * ESP32
     * =========================================================
     */

    const deviceKey = req.headers["x-device-key"];

    if (deviceKey === DEVICE_KEY) {

      /*
       * ESP32 CONSULTA COMANDOS
       */
      if (req.method === "GET") {

        const state = await getState();

        const commandRaw = await redis("GET", [
          COMMAND_KEY
        ]);

        let command = null;

        if (commandRaw) {
          try {
            command = JSON.parse(commandRaw);
          } catch {
            command = null;
          }

          // O comando é consumido pelo ESP32
          await redis("DEL", [COMMAND_KEY]);
        }

        return res.status(200).json({
          ok: true,
          command,
          state
        });
      }

      /*
       * ESP32 ENVIA TELEMETRIA
       */
      if (req.method === "POST") {

        let body = req.body;

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

        if (!body) {
          return res.status(400).json({
            ok: false,
            error: "Nenhum dado recebido"
          });
        }

        const oldState = await getState();

        const state = {
          pump: body.pump !== undefined
            ? !!body.pump
            : oldState.pump,

          mode: body.mode || oldState.mode,

          bucket: body.bucket !== undefined
            ? Number(body.bucket)
            : oldState.bucket,

          battery: body.battery !== undefined
            ? Number(body.battery)
            : oldState.battery,

          voltage: body.voltage !== undefined
            ? Number(body.voltage)
            : oldState.voltage,

          hours: body.hours !== undefined
            ? Number(body.hours)
            : oldState.hours,

          online: true,
          updated: Date.now()
        };

        await saveState(state);

        return res.status(200).json({
          ok: true
        });
      }

      return res.status(405).json({
        ok: false,
        error: "Método não permitido"
      });
    }

    /*
     * =========================================================
     * SITE
     * =========================================================
     */

    if (req.method === "GET") {

      const state = await getState();

      // Se o ESP32 não atualiza há mais de 10 segundos,
      // consideramos offline.
      const online =
        state.updated > 0 &&
        Date.now() - state.updated < 10000;

      return res.status(200).json({
        pump: state.pump ? 1 : 0,
        mode: state.mode,
        bucket: Number(state.bucket) || 0,
        batt: Number(state.battery) || 0,
        volt: Number(state.voltage) || 0,
        hours: Number(state.hours) || 0,
        online
      });
    }

    /*
     * SITE ENVIA COMANDO
     */
    if (req.method === "POST") {

      let body = req.body;

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

      if (!body || !body.type) {
        return res.status(400).json({
          ok: false,
          error: "Comando inválido"
        });
      }

      let command = null;

      if (body.type === "pump") {

        command = {
          type: "pump",
          value: body.value ? 1 : 0,
          time: Date.now()
        };

      } else if (body.type === "mode") {

        if (
          body.value !== "continuous" &&
          body.value !== "pulse"
        ) {
          return res.status(400).json({
            ok: false,
            error: "Modo inválido"
          });
        }

        command = {
          type: "mode",
          value: body.value,
          time: Date.now()
        };

      } else {
        return res.status(400).json({
          ok: false,
          error: "Comando desconhecido"
        });
      }

      await redis("SET", [
        COMMAND_KEY,
        JSON.stringify(command),
        "EX",
        "60"
      ]);

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
      error: "Erro interno da API"
    });
  }
}
