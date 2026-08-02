import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Funções auxiliares pra banco de dados
export async function salvarConfig(config) {
  const { data, error } = await supabase
    .from('config')
    .upsert([{ id: 'global', ...config }], { onConflict: 'id' })
  if (error) console.error('Erro ao salvar config:', error)
  return data
}

export async function carregarConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('id', 'global')
    .single()
  if (error) console.error('Erro ao carregar config:', error)
  return data
}

export async function salvarDados(dispositivo, dados) {
  const { data, error } = await supabase
    .from('dados')
    .insert([{ dispositivo, ...dados, created_at: new Date() }])
  if (error) console.error('Erro ao salvar dados:', error)
  return data
}

export async function carregarHistorico(dispositivo, limite = 100) {
  const { data, error } = await supabase
    .from('dados')
    .select('*')
    .eq('dispositivo', dispositivo)
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) console.error('Erro ao carregar histórico:', error)
  return data
}
