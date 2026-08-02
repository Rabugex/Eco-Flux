import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Analytics() {
  const [historico, setHistorico] = useState([])
  const [stats, setStats] = useState({
    totalHoras: 0,
    mediaTensao: 0,
    mediaLevel: 0,
    consumoEstimado: 0
  })

  useEffect(() => {
    // Carregar histórico do Supabase
    fetch('/api/dados?dispositivo=ecoflux-main&limite=288')
      .then(r => r.json())
      .then(dados => {
        if (dados && dados.length > 0) {
          setHistorico(dados)
          calcularStats(dados)
        }
      })
  }, [])

  function calcularStats(dados) {
    if (dados.length === 0) return

    const bombaLigada = dados.filter(d => d.bomba).length
    const totalHoras = (bombaLigada * 5) / 60 // 5 min de intervalo
    const mediaTensao = dados.reduce((a, b) => a + (b.tensao || 0), 0) / dados.length
    const mediaLevel = dados.reduce((a, b) => a + (b.nivel || 0), 0) / dados.length
    const consumoEstimado = totalHoras * 3 * 12 / 1000 // Amp/h estimado

    setStats({
      totalHoras: totalHoras.toFixed(1),
      mediaTensao: mediaTensao.toFixed(1),
      mediaLevel: mediaLevel.toFixed(0),
      consumoEstimado: consumoEstimado.toFixed(2)
    })
  }

  // Dados para os gráficos (últimas 12h)
  const ultimasHoras = historico.slice(0, 144) // 12h com intervalo de 5min
  const chartTensao = ultimasHoras.map(d => ({
    time: new Date(d.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    value: d.tensao || 0
  })).reverse()

  const chartNivel = ultimasHoras.map(d => ({
    time: new Date(d.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    value: d.nivel || 0
  })).reverse()

  const chartUptime = ultimasHoras.map(d => ({
    time: new Date(d.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    value: d.bomba ? 1 : 0
  })).reverse()

  return (
    <>
      <Head>
        <title>Analíticas - EcoFlux</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
        <style>{`
          :root {
            --water: #00c2d1;
            --leaf: #3dd68c;
            --deep: #020d0f;
            --danger: #e8394a;
            --warn: #f5a623;
            --text: #d4eef2;
            --muted: #3a6672;
            --card: #0b1e23;
            --border: #12303a;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: var(--deep); color: var(--text); font-family: 'Outfit', -apple-system, sans-serif; }
          header { position: sticky; top: 0; z-index: 100; background: rgba(2,13,15,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
          .logo { display: flex; align-items: center; gap: 10px; }
          .logo-text { font-size: 1.3em; font-weight: 900; letter-spacing: 1px; background: linear-gradient(90deg,var(--water),var(--leaf)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          main { max-width: 800px; margin: 0 auto; padding: 20px 16px 40px; }
          .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 14px; }
          .card-title { font-size: 0.85em; letter-spacing: 2px; text-transform: uppercase; color: var(--water); margin-bottom: 14px; font-weight: 700; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px; }
          .stat-box { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; text-align: center; }
          .stat-value { font-size: 2em; font-weight: 700; color: var(--water); }
          .stat-label { font-size: 0.8em; color: var(--muted); margin-top: 5px; }
          .chart-container { position: relative; height: 300px; margin-bottom: 10px; }
          a { color: var(--water); text-decoration: none; margin-top: 10px; display: inline-block; }
        `}</style>
      </Head>

      <header>
        <div className="logo">
          <div style={{fontSize: '24px'}}>📊</div>
          <div>
            <div className="logo-text">Analíticas</div>
            <div style={{fontSize: '0.65em', color: 'var(--muted)', letterSpacing: '2px'}}>DESEMPENHO</div>
          </div>
        </div>
        <a href="/">← Voltar</a>
      </header>

      <main>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value">{stats.totalHoras}h</div>
            <div className="stat-label">Horas de Operação</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.mediaTensao}V</div>
            <div className="stat-label">Tensão Média</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.mediaLevel}%</div>
            <div className="stat-label">Nível Médio</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.consumoEstimado}Ah</div>
            <div className="stat-label">Consumo Estimado</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📈 Tensão da Bateria (12h)</div>
          <div className="chart-container">
            <SimpleLineChart data={chartTensao} color="var(--leaf)" min={10} max={14} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">💧 Nível do Reservatório (12h)</div>
          <div className="chart-container">
            <SimpleLineChart data={chartNivel} color="var(--water)" min={0} max={100} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">💡 Status da Bomba (12h)</div>
          <div className="chart-container">
            <SimpleBarChart data={chartUptime} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">📊 Resumo</div>
          <div style={{fontSize: '0.9em', lineHeight: '1.8', color: 'var(--text)'}}>
            <p>📌 Total de registros: <strong>{historico.length}</strong></p>
            <p>⏱️ Período: <strong>últimas 24 horas</strong></p>
            <p>📅 Atualizado: <strong>{new Date().toLocaleString('pt-BR')}</strong></p>
            <p>🔋 Bateria está em bom estado se a tensão se mantém acima de 12V</p>
            <p>💧 Nível ideal do reservatório é entre 50-90%</p>
          </div>
        </div>
      </main>
    </>
  )
}

function SimpleLineChart({ data, color, min, max }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = document.getElementById('lineChart')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.time),
        datasets: [{
          label: 'Valor',
          data: data.map(d => d.value),
          borderColor: color,
          backgroundColor: color + '33',
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: min,
            max: max,
            ticks: { color: 'var(--muted)' },
            grid: { color: 'var(--border)' }
          },
          x: {
            ticks: { color: 'var(--muted)' },
            grid: { display: false }
          }
        }
      }
    })

    return () => chart.destroy()
  }, [data])

  return <canvas id="lineChart"></canvas>
}

function SimpleBarChart({ data }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const canvas = document.getElementById('barChart')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.time),
        datasets: [{
          label: 'Bomba Ligada',
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.value === 1 ? '#3dd68c' : '#12303a'),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            max: 1,
            ticks: { display: false },
            grid: { display: false }
          },
          x: {
            ticks: { color: 'var(--muted)' },
            grid: { display: false }
          }
        }
      }
    })

    return () => chart.destroy()
  }, [data])

  return <canvas id="barChart"></canvas>
}
