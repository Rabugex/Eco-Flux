import { salvarConfig, carregarConfig } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await carregarConfig()
    res.status(200).json(config || {
      name: 'EcoFlux',
      sub: 'CONTROLE DE ÁGUA',
      icon: '🌊',
      colors: { water: '#00c2d1', leaf: '#3dd68c', deep: '#020d0f' },
      limits: { bat: 500, pump: 1000, motor: 2000, filter: 4320 }
    })
  } else if (req.method === 'POST') {
    const config = await salvarConfig(req.body)
    res.status(200).json(config)
  } else {
    res.status(405).end()
  }
}
