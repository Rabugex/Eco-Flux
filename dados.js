import { salvarDados, carregarHistorico } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { dispositivo, bomba, nivel, tensao, uptime, motorPos } = req.body
    const dados = await salvarDados(dispositivo, {
      bomba, nivel, tensao, uptime, motorPos
    })
    res.status(200).json(dados)
  } else if (req.method === 'GET') {
    const { dispositivo, limite = 100 } = req.query
    const historico = await carregarHistorico(dispositivo, parseInt(limite))
    res.status(200).json(historico || [])
  } else {
    res.status(405).end()
  }
}
