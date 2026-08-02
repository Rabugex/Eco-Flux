import Head from 'next/head'

export default function Analytics() {
  const stats = {
    totalHoras: 12.5,
    mediaTensao: 12.3,
    mediaLevel: 65,
    consumoEstimado: 1.35
  }

  const chartData = [
    { time: '00:00', tensao: 12.6, nivel: 45, bomba: 0 },
    { time: '01:00', tensao: 12.5, nivel: 52, bomba: 1 },
    { time: '02:00', tensao: 12.4, nivel: 68, bomba: 1 },
    { time: '03:00', tensao: 12.3, nivel: 75, bomba: 1 },
    { time: '04:00', tensao: 12.2, nivel: 82, bomba: 1 },
    { time: '05:00', tensao: 12.1, nivel: 88, bomba: 0 },
    { time: '06:00', tensao: 12.0, nivel: 85, bomba: 0 },
    { time: '07:00', tensao: 11.9, nivel: 78, bomba: 0 },
    { time: '08:00', tensao: 11.8, nivel: 65, bomba: 0 },
    { time: '09:00', tensao: 11.9, nivel: 58, bomba: 1 },
    { time: '10:00', tensao: 12.1, nivel: 72, bomba: 1 },
    { time: '11:00', tensao: 12.3, nivel: 85, bomba: 1 }
  ]

  return (
    <>
      <Head>
        <title>Analíticas - EcoFlux</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          :root {
            --water: #00c2d1; --leaf: #3dd68c; --deep: #020d0f;
            --text: #d4eef2; --muted: #3a6672; --card: #0b1e23; --border: #12303a;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: var(--deep); color: var(--text); font-family: 'Outfit', sans-serif; }
          header { background: rgba(2,13,15,0.92); border-bottom: 1px solid var(--border); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
          .logo { display: flex; gap: 10px; align-items: center; }
          .logo-text { font-size: 1.3em; font-weight: 900; background: linear-gradient(90deg,var(--water),var(--leaf)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          main { max-width: 900px; margin: 0 auto; padding: 20px 16px 40px; }
          .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 14px; }
          .card-title { font-size: 0.85em; letter-spacing: 2px; text-transform: uppercase; color: var(--water); margin-bottom: 14px; font-weight: 700; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 14px; }
          .stat-box { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; text-align: center; }
          .stat-value { font-size: 2em; font-weight: 700; color: var(--water); }
          .stat-label { font-size: 0.75em; color: var(--muted); margin-top: 8px; }
          a { color: var(--water); text-decoration: none; font-weight: 700; }
          svg { width: 100%; height: auto; }
        `}</style>
      </Head>

      <header>
        <div className="logo">
          <div style={{fontSize: '24px'}}>📊</div>
          <div>
            <div className="logo-text">Analíticas</div>
            <div style={{fontSize: '0.65em', color: 'var(--muted)'}}>DESEMPENHO</div>
          </div>
        </div>
        <a href="/">← Voltar</a>
      </header>

      <main>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value">{stats.totalHoras}h</div>
            <div className="stat-label">Operação</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.mediaTensao}V</div>
            <div className="stat-label">Tensão</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.mediaLevel}%</div>
            <div className="stat-label">Nível</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.consumoEstimado}Ah</div>
            <div className="stat-label">Consumo</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📈 Tensão (12h)</div>
          <LineChart data={chartData} dataKey="tensao" color="#3dd68c" min={11} max={13} />
        </div>

        <div className="card">
          <div className="card-title">💧 Nível (12h)</div>
          <LineChart data={chartData} dataKey="nivel" color="#00c2d1" min={0} max={100} />
        </div>

        <div className="card">
          <div className="card-title">💡 Status Bomba</div>
          <BarChart data={chartData} />
        </div>
      </main>
    </>
  )
}

function LineChart({ data, dataKey, color, min, max }) {
  const width = 650, height = 250, padding = 40
  const graphWidth = width - padding * 2
  const graphHeight = height - padding * 2

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * graphWidth + padding
    const y = height - padding - ((d[dataKey] - min) / (max - min)) * graphHeight
    return { x, y }
  })

  const pathD = 'M ' + points.map(p => `${p.x},${p.y}`).join(' L ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {[0, 0.5, 1].map((r, i) => <line key={i} x1={padding} y1={height - padding - r * graphHeight} x2={width - padding} y2={height - padding - r * graphHeight} stroke="#12303a" strokeWidth="1" />)}
      <path d={pathD + ` L ${points[points.length-1].x},${height - padding} L ${padding},${height - padding} Z`} fill={color + '30'} />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#12303a" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#12303a" />
    </svg>
  )
}

function BarChart({ data }) {
  const width = 650, height = 200, padding = 40
  const barWidth = (width - padding * 2) / data.length * 0.7
  const spacing = (width - padding * 2) / data.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`}>
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#12303a" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#12303a" />
      {data.map((d, i) => {
        const x = padding + i * spacing + (spacing - barWidth) / 2
        const barHeight = d.bomba * (height - padding * 2)
        return <rect key={i} x={x} y={height - padding - barHeight} width={barWidth} height={barHeight} fill={d.bomba ? '#3dd68c' : '#12303a'} />
      })}
    </svg>
  )
}
