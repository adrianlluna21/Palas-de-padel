import React, { useState } from 'react'

type Hole = { x: number, y: number, d: number }

export default function PalaIAConfigurator() {
  const [view, setView] = useState<'form'|'result'>('form')
  const [chatText, setChatText] = useState('')
  const [inputData, setInputData] = useState({
    level: 'medio',
    swing_speed: 'media',
    handed: 'right',
    preferences: { control: 3, power: 3, spin: 3 },
    injuries: ''
  })
  const [recommendation, setRecommendation] = useState<any | null>(null)
  const [holes, setHoles] = useState<Hole[]>([{ x:120, y:80, d:8 }, { x:140, y:100, d:8 }])

  function addHole(){ setHoles(h=>[...h, { x:100, y:120, d:8 }]) }
  function updateHole(i:number, patch:Partial<Hole>){ setHoles(h=>h.map((hh,idx)=> idx===i ? {...hh, ...patch} : hh)) }
  function removeHole(i:number){ setHoles(h=>h.filter((_,idx)=>idx!==i)) }

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault()
    const payload = { ...inputData, user_text: chatText }
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const rec = await res.json()
    setRecommendation(rec)
    setView('result')
  }

  function violations(){
    const list:any[] = []
    const minEdge = 12
    const minBetween = 8
    const width = 260, height = 350
    holes.forEach((h,i)=>{
      if (h.x - h.d/2 < minEdge || h.x + h.d/2 > width - minEdge || h.y - h.d/2 < minEdge || h.y + h.d/2 > height - minEdge) {
        list.push({ type:'edge', index:i })
      }
      for(let j=i+1;j<holes.length;j++){
        const dx = h.x - holes[j].x, dy = h.y - holes[j].y
        const dist = Math.sqrt(dx*dx+dy*dy)
        if (dist < (h.d + holes[j].d)/2 + minBetween) list.push({ type:'between', i, j })
      }
    })
    return list
  }

  const vio = violations()

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Configurador PalaIA</h2>
      </header>

      {view==='form' && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="p-4 border rounded bg-white">
            <label className="block font-medium">Describe cómo juegas</label>
            <textarea value={chatText} onChange={e=>setChatText(e.target.value)} className="w-full p-2 border rounded mt-2" rows={5} placeholder="Soy zurdo, juego defensivo..." />

            <div className="mt-3">
              <label className="block">Nivel</label>
              <select value={inputData.level} onChange={e=>setInputData(s=>({...s, level: e.target.value}))} className="mt-1 p-2 border rounded">
                <option value="principiante">Principiante</option>
                <option value="medio">Medio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block">Swing</label>
              <select value={inputData.swing_speed} onChange={e=>setInputData(s=>({...s, swing_speed: e.target.value}))} className="mt-1 p-2 border rounded">
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block">Control / Power</label>
              <div className="flex gap-2 items-center">
                <input type="range" min={1} max={5} value={inputData.preferences.control} onChange={e=>setInputData(s=>({...s, preferences: {...s.preferences, control: Number(e.target.value)}}))} />
                <input type="range" min={1} max={5} value={inputData.preferences.power} onChange={e=>setInputData(s=>({...s, preferences: {...s.preferences, power: Number(e.target.value)}}))} />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Generar recomendación</button>
              <button type="button" onClick={()=>{ setChatText(''); setInputData({ level:'medio', swing_speed:'media', handed:'right', preferences:{control:3,power:3,spin:3}, injuries:'' }) }} className="px-3 py-2 bg-gray-200 rounded">Reset</button>
            </div>
          </form>

          <div className="p-4 border rounded bg-white">
            <h3 className="font-medium">Editor de agujeros (básico)</h3>
            <div className="mt-2 flex gap-2 mb-2">
              <button onClick={addHole} className="px-2 py-1 bg-gray-100 rounded">Añadir</button>
            </div>
            <div className="flex gap-4">
              <svg width="260" height="350" viewBox="0 0 260 350" className="border bg-gray-50">
                <rect x="0" y="0" width="260" height="350" rx="20" fill="#fff" stroke="#eee" />
                {holes.map((h,i)=>(
                  <circle key={i} cx={h.x} cy={h.y} r={h.d/2} fill={vio.find(v=>v.type==='edge'&&v.index===i) ? 'rgba(255,0,0,0.6)' : 'rgba(0,0,0,0.2)'} />
                ))}
              </svg>

              <div className="w-48">
                {holes.map((h,i)=>(
                  <div key={i} className="flex items-center gap-1 mb-1">
                    <div className="text-sm">#{i+1}</div>
                    <input type="number" value={h.x} onChange={e=>updateHole(i,{x: Number(e.target.value)})} className="w-12 p-1 border rounded text-sm" />
                    <input type="number" value={h.y} onChange={e=>updateHole(i,{y: Number(e.target.value)})} className="w-12 p-1 border rounded text-sm" />
                    <input type="number" value={h.d} onChange={e=>updateHole(i,{d: Number(e.target.value)})} className="w-12 p-1 border rounded text-sm" />
                    <button onClick={()=>removeHole(i)} className="text-red-500">x</button>
                  </div>
                ))}
                <div className="text-xs text-red-600 mt-2">{vio.length>0 ? `${vio.length} violación(es) detectadas` : 'Sin violaciones'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view==='result' && recommendation && (
        <div className="p-4 bg-white border rounded">
          <h3 className="font-semibold">Recomendación generada</h3>
          <pre className="mt-2 p-2 bg-gray-50 rounded text-sm">{JSON.stringify(recommendation, null, 2)}</pre>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={()=>setView('form')}>Volver</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>alert('En producción: generar STL y enviar a fabricación')}>Exportar STL</button>
          </div>
        </div>
      )}
    </div>
  )
}
