import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [connected, setConnected] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [config, setConfig] = useState({
    name: 'EcoFlux',
    sub: 'CONTROLE DE ÁGUA',
    icon: '🌊',
    colors: { water: '#00c2d1', leaf: '#3dd68c', deep: '#020d0f' },
    limits: { bat: 500, pump: 1000, motor: 2000, filter: 4320 }
  })

  const [data, setData] = useState({
    bombaOn: false,
    uptime: '00:00:00',
    nivel: 0,
    tensao: 0,
    motorPos: 0,
    timerRestante: 0
  })

  const [stats, setStats] = useState({
    batHours: 0,
    pumpHours: 0,
    motorHours: 0,
    filterHours: 0
  })

  const [rxChar, setRxChar] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  // Carregar config do servidor
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig)
  }, [])

  // Conectar ESP32 via BLE
  async function conectar() {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'EcoFlux' }],
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      })
      
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e')
      const rx = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e')
      const tx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e')

      setRxChar(rx)
      setConnected(true)

      await tx.startNotifications()
      tx.addEventListener('characteristicvaluechanged', onData)

      device.addEventListener('gattserverdisconnected', () => setConnected(false))
    } catch (e) {
      console.error('Erro BLE:', e)
    }
  }

  function onData(e) {
    const msg = new TextDecoder().decode(e.target.value).trim()
    
    if (msg.startsWith('STATUS:')) {
      const p = msg.split(':')
      const novoData = {
        bombaOn: p[1] === '1',
        uptime: p[2] + ':' + p[3] + ':' + p[4],
        tensao: parseFloat(p[5]),
        timerRestante: parseInt(p[6]) || 0,
        nivel: parseInt(p[7]) || 0,
        motorPos: parseInt(p[8]) || 0
      }
      setData(novoData)

      // Salvar no Supabase
      fetch('/api/dados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositivo: 'ecoflux-main',
          bomba: novoData.bombaOn,
          nivel: novoData.nivel,
          tensao: novoData.tensao,
          uptime: novoData.uptime,
          motorPos: novoData.motorPos
        })
      })
    }
  }

  async function enviar(cmd) {
    if (!rxChar) return
    await rxChar.writeValue(new TextEncoder().encode(cmd))
  }

  function ligar() { enviar('L') }
  function desligar() { enviar('D') }
  function definirTimer(min) {
    if (min === 1067) {
      setAdminOpen(true)
    } else if (min > 0) {
      enviar('T:' + min)
    }
  }
  function moverMotor(dir) { enviar('M:' + dir) }

  async function salvarConfig(novaConfig) {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaConfig)
    })
    setConfig(novaConfig)
    setAdminOpen(false)
  }

  const pctBateria = Math.min(100, Math.max(0, ((data.tensao - 10.5) / (12.6 - 10.5)) * 100))
  const pctBat = Math.min(100, (stats.batHours / config.limits.bat) * 100)
  const pctPump = Math.min(100, (stats.pumpHours / config.limits.pump) * 100)
  const pctMotor = Math.min(100, (stats.motorHours / config.limits.motor) * 100)
  const pctFilter = Math.min(100, (stats.filterHours / config.limits.filter) * 100)

  const healthColor = (pct) => pct < 50 ? '#3dd68c' : pct < 75 ? '#f5a623' : '#e8394a'

  return (
    <>
      <Head>
        <title>{config.name}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          :root {
            --water: ${config.colors.water};
            --leaf: ${config.colors.leaf};
            --deep: ${config.colors.deep};
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
          .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg,var(--water),var(--leaf)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
          .logo-text { font-size: 1.3em; font-weight: 900; letter-spacing: 1px; background: linear-gradient(90deg,var(--water),var(--leaf)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .logo-sub { font-size: 0.65em; color: var(--muted); letter-spacing: 2px; }
          #conn-pill { display: flex; align-items: center; gap: 7px; background: var(--card); border: 1px solid var(--border); border-radius: 99px; padding: 6px 14px; font-size: 0.78em; font-weight: 600; cursor: pointer; }
          #conn-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); transition: background 0.4s; }
          #conn-dot.on { background: var(--leaf); box-shadow: 0 0 8px var(--leaf); animation: blink 2s infinite; }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .tabs { position: sticky; top: 60px; z-index: 99; background: rgba(2,13,15,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); display: flex; padding: 0; overflow-x: auto; }
          .tab-btn { flex-shrink: 0; padding: 12px 20px; border: none; background: transparent; color: var(--muted); font-size: 0.9em; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
          .tab-btn.active { color: var(--water); border-bottom-color: var(--water); }
          main { max-width: 480px; margin: 0 auto; padding: 20px 16px 120px; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 14px; }
          .card-title { font-size: 0.68em; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }
          .btn { padding: 12px 16px; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; margin: 5px 0; }
          .btn-on { background: var(--leaf); color: #000; }
          .btn-off { background: var(--danger); color: #fff; }
          .btn-timer { background: linear-gradient(135deg,var(--water),#0099a8); color: #000; font-weight: 700; }
          .btn-admin { background: var(--water); color: #000; font-weight: 700; }
          .pump-name { font-size: 1.1em; font-weight: 700; }
          .bucket-pct { font-size: 2.6em; font-weight: 700; color: var(--water); }
          .bat-pct { font-size: 2em; font-weight: 700; color: var(--leaf); }
          .hours-big { font-size: 3em; font-weight: 700; color: var(--water); }
          .bar-bg { width: 100%; height: 10px; background: var(--border); border-radius: 99px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s, background 0.5s; }
          .health-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .health-item { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 12px; text-align: center; font-size: 0.8em; }
          .health-icon { font-size: 1.4em; margin-bottom: 6px; }
          .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; overflow-y: auto; }
          .modal.open { display: flex; align-items: center; justify-content: center; }
          .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; max-width: 500px; }
          .modal-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--muted); font-size: 1.2em; cursor: pointer; }
          input { background: var(--deep); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 12px; font-family: inherit; font-size: 0.9em; outline: none; width: 100%; margin-bottom: 10px; }
          input:focus { border-color: var(--water); }
        `}</style>
      </Head>

      <header>
        <div className="logo">
          <div className="logo-icon">{config.icon}</div>
          <div>
            <div className="logo-text">{config.name}</div>
            <div className="logo-sub">{config.sub}</div>
          </div>
        </div>
        <div id="conn-pill" onClick={conectar} style={{cursor: 'pointer'}}>
          <div id="conn-dot" className={connected ? 'on' : ''}></div>
          <span>{connected ? config.name : 'Conectar'}</span>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠 Home</button>
        <button className={`tab-btn ${activeTab === 'reservoir' ? 'active' : ''}`} onClick={() => setActiveTab('reservoir')}>🪣 Reservatório</button>
        <button className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>🔋 Sistema</button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Config</button>
      </div>

      <main>
        {/* HOME TAB */}
        <div className={`tab-content ${activeTab === 'home' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-title">💧 Bomba de Porão</div>
            <div style={{fontSize: '1.1em', fontWeight: 700, marginBottom: '16px'}}>
              {data.bombaOn ? '🌀 LIGADA' : '💧 DESLIGADA'}
            </div>
            <div style={{fontSize: '0.8em', color: 'var(--muted)', marginBottom: '16px'}}>
              Uptime: {data.uptime}
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              <button className="btn btn-on" onClick={ligar} disabled={!connected}>▶ Ligar</button>
              <button className="btn btn-off" onClick={desligar} disabled={!connected}>■ Desligar</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">⏱️ Timer</div>
            <div style={{display: 'flex', gap: '10px'}}>
              <input type="number" placeholder="minutos" id="timer-input" min="1" max="999" />
              <button className="btn btn-timer" onClick={() => {
                const v = parseInt(document.getElementById('timer-input').value)
                definirTimer(v)
              }} disabled={!connected}>Iniciar</button>
            </div>
            {data.timerRestante > 0 && <div style={{marginTop: '10px', textAlign: 'center', color: 'var(--water)'}}>
              ⏱ Restam {Math.floor(data.timerRestante / 60)}m {data.timerRestante % 60}s
            </div>}
          </div>
        </div>

        {/* RESERVOIR TAB */}
        <div className={`tab-content ${activeTab === 'reservoir' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-title">🪣 Nível do Reservatório</div>
            <div style={{display: 'flex', gap: '20px', alignItems: 'flex-end'}}>
              <div style={{minWidth: '80px', height: '120px', border: '2px solid var(--border)', borderRadius: '8px', position: 'relative', overflow: 'hidden'}}>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: (data.nivel / 100 * 110) + 'px',
                  background: 'linear-gradient(180deg, rgba(0,194,209,0.6), rgba(0,194,209,0.9))',
                  transition: 'height 1.2s'
                }}></div>
              </div>
              <div>
                <div className="bucket-pct">{data.nivel}%</div>
                <div style={{fontSize: '0.8em', color: 'var(--muted)'}}>nível atual</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚙️ Motor NEMA 23</div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              <button className="btn" style={{background: 'var(--card)', border: '1px solid var(--border)'}} onClick={() => moverMotor('U')} disabled={!connected}>⬆️ Subir</button>
              <button className="btn" style={{background: 'var(--card)', border: '1px solid var(--border)'}} onClick={() => moverMotor('D')} disabled={!connected}>⬇️ Descer</button>
            </div>
            <div style={{marginTop: '8px', textAlign: 'center', fontSize: '0.8em', color: 'var(--muted)'}}>
              Posição: {data.motorPos}% ({data.motorPos < 33 ? 'Baixo' : data.motorPos < 66 ? 'Médio' : 'Alto'})
            </div>
          </div>
        </div>

        {/* SYSTEM TAB */}
        <div className={`tab-content ${activeTab === 'system' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-title">🔋 Bateria AGM</div>
            <div style={{marginBottom: '10px'}}>
              <div className="bat-pct">{isNaN(pctBateria) ? '--' : Math.round(pctBateria)}%</div>
              <div style={{fontSize: '0.8em', color: 'var(--muted)'}}>{isNaN(data.tensao) ? '--' : data.tensao.toFixed(1)} V</div>
            </div>
            <div className="bar-bg">
              <div className="bar-fill" style={{
                width: (isNaN(pctBateria) ? 0 : pctBateria) + '%',
                background: pctBateria > 50 ? 'var(--leaf)' : pctBateria > 20 ? 'var(--warn)' : 'var(--danger)'
              }}></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📊 Vida Útil</div>
            <div className="health-grid">
              <div className="health-item">
                <div className="health-icon">🔋</div>
                <div style={{fontSize: '0.65em', textTransform: 'uppercase', marginBottom: '6px'}}>Bateria</div>
                <div style={{fontWeight: 700, marginBottom: '6px'}}>{stats.batHours.toFixed(1)}h</div>
                <div className="bar-bg" style={{marginBottom: '6px'}}>
                  <div className="bar-fill" style={{width: pctBat + '%', background: healthColor(pctBat)}}></div>
                </div>
                <div style={{fontSize: '0.65em', color: 'var(--muted)'}}>{Math.round(stats.batHours)} / {config.limits.bat}h</div>
              </div>
              <div className="health-item">
                <div className="health-icon">💧</div>
                <div style={{fontSize: '0.65em', textTransform: 'uppercase', marginBottom: '6px'}}>Bomba</div>
                <div style={{fontWeight: 700, marginBottom: '6px'}}>{stats.pumpHours.toFixed(1)}h</div>
                <div className="bar-bg" style={{marginBottom: '6px'}}>
                  <div className="bar-fill" style={{width: pctPump + '%', background: healthColor(pctPump)}}></div>
                </div>
                <div style={{fontSize: '0.65em', color: 'var(--muted)'}}>{Math.round(stats.pumpHours)} / {config.limits.pump}h</div>
              </div>
              <div className="health-item">
                <div className="health-icon">⚙️</div>
                <div style={{fontSize: '0.65em', textTransform: 'uppercase', marginBottom: '6px'}}>Motor</div>
                <div style={{fontWeight: 700, marginBottom: '6px'}}>{stats.motorHours.toFixed(1)}h</div>
                <div className="bar-bg" style={{marginBottom: '6px'}}>
                  <div className="bar-fill" style={{width: pctMotor + '%', background: healthColor(pctMotor)}}></div>
                </div>
                <div style={{fontSize: '0.65em', color: 'var(--muted)'}}>{Math.round(stats.motorHours)} / {config.limits.motor}h</div>
              </div>
              <div className="health-item">
                <div className="health-icon">🔧</div>
                <div style={{fontSize: '0.65em', textTransform: 'uppercase', marginBottom: '6px'}}>Filtro</div>
                <div style={{fontWeight: 700, marginBottom: '6px'}}>{stats.filterHours.toFixed(1)}h</div>
                <div className="bar-bg" style={{marginBottom: '6px'}}>
                  <div className="bar-fill" style={{width: pctFilter + '%', background: healthColor(pctFilter)}}></div>
                </div>
                <div style={{fontSize: '0.65em', color: 'var(--muted)'}}>{Math.round(stats.filterHours)} / {config.limits.filter}h</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📈 Total</div>
            <div className="hours-big">{stats.batHours.toFixed(1)}h</div>
            <div style={{fontSize: '0.75em', color: 'var(--muted)'}}>desde o primeiro uso</div>
          </div>
        </div>

        {/* SETTINGS TAB */}
        <div className={`tab-content ${activeTab === 'settings' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-title">Personalizações</div>
            <button className="btn btn-admin" onClick={() => setRenameOpen(true)} style={{width: '100%', marginBottom: '10px'}}>Renomear</button>
            <button className="btn btn-admin" onClick={() => setAdminOpen(true)} style={{width: '100%'}}>⚙️ Admin (1067)</button>
          </div>
        </div>
      </main>

      {/* ADMIN MODAL */}
      <div className={`modal ${adminOpen ? 'open' : ''}`} onClick={() => setAdminOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setAdminOpen(false)}>✕</button>
          <h2 style={{marginBottom: '20px', color: 'var(--water)'}}>⚙️ Administrador</h2>
          
          <label style={{fontSize: '0.8em', color: 'var(--muted)', display: 'block', marginBottom: '5px'}}>Cor Primária</label>
          <input type="color" defaultValue={config.colors.water} onChange={e => {
            const newConfig = {...config, colors: {...config.colors, water: e.target.value}}
            setConfig(newConfig)
          }} />

          <label style={{fontSize: '0.8em', color: 'var(--muted)', display: 'block', marginBottom: '5px'}}>Nome</label>
          <input type="text" defaultValue={config.name} onChange={e => {
            const newConfig = {...config, name: e.target.value}
            setConfig(newConfig)
          }} />

          <label style={{fontSize: '0.8em', color: 'var(--muted)', display: 'block', marginBottom: '5px'}}>Limite Bateria (h)</label>
          <input type="number" defaultValue={config.limits.bat} onChange={e => {
            const newConfig = {...config, limits: {...config.limits, bat: parseInt(e.target.value)}}
            setConfig(newConfig)
          }} />

          <button className="btn btn-admin" onClick={() => salvarConfig(config)} style={{width: '100%'}}>Salvar</button>
        </div>
      </div>

      {/* RENAME MODAL */}
      <div className={`modal ${renameOpen ? 'open' : ''}`} onClick={() => setRenameOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2 style={{marginBottom: '15px'}}>Renomear Sistema</h2>
          <input type="text" id="rename-input" placeholder="Novo nome" defaultValue={config.name} />
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn btn-admin" onClick={() => {
              const nome = document.getElementById('rename-input').value
              if (nome) {
                const newConfig = {...config, name: nome}
                salvarConfig(newConfig)
                setRenameOpen(false)
              }
            }} style={{flex: 1}}>Salvar</button>
            <button className="btn" style={{background: 'var(--card)', border: '1px solid var(--border)', flex: 1}} onClick={() => setRenameOpen(false)}>Cancelar</button>
          </div>
        </div>
      </div>
    </>
  )
}
