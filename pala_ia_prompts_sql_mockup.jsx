// === PalaIA - Deliverables ===
// Archivo único que contiene 3 artefactos listos para copiar/pegar:
// 1) prompts.json  (prompt engineering pack)
// 2) schema.sql    (DDL PostgreSQL)
// 3) Mockup React  (Single-file React component / landing + configurador básico)

/* --------------------------------------------------------------------------
  1) prompts.json
  Copia/pega este JSON al repositorio de prompts o al gestor de prompts
   - system: rol del LLM
   - templates: prompt template con placeholders
   - few_shots: ejemplos
*/

{
  "system": "Eres un asistente técnico que transforma descripciones de jugadores de pádel en parámetros técnicos de una pala. Respondes SOLO en JSON válido con campos precisos. Aplica reglas de seguridad: no recomiendes parámetros fuera de los límites del taller. Si la descripción es ambigua, rellena con valores conservadores orientados a control. Nunca devuelvas instrucciones de fabricación inseguras.",

  "template": "Usuario: {user_text}\nDatos: level={level}, age={age}, height_cm={height_cm}, handed={handed}, injuries={injuries}, preferences={preferences}, swing_speed={swing_speed}\n\nInstrucciones: Devuelve un JSON con:\n- weight_g (int), balance_mm (int), shape (redonda/lagrima/diamante), core (string),\n- face (string), rim_thickness_mm (int), surface_roughness (bool),\n- holes: {pattern_type, n_holes, hole_diameters_mm (list or single), coordinates (list of {x,y,d})}\n- safety_checks: {min_dist_to_edge_mm, min_dist_between_holes_mm}\n- confidence (0..1)\nResponde SOLO JSON.",

  "few_shots": [
    {
      "input": "Juego ofensivo, remates fuertes, swing muy rápido, 28 años",
      "output": {
        "weight_g": 370,
        "balance_mm": 275,
        "shape": "diamante",
        "core": "EVA_30_hard",
        "face": "carbon_12k",
        "rim_thickness_mm": 36,
        "surface_roughness": false,
        "holes": { "pattern_type":"cluster","n_holes":24, "hole_diameters_mm": [7,7,7,7], "coordinates": [] },
        "safety_checks": { "min_dist_to_edge_mm": 12, "min_dist_between_holes_mm": 9 },
        "confidence": 0.92
      }
    },
    {
      "input": "Juego defensivo, priorizo control, lesión en codo, 35 años",
      "output": {
        "weight_g": 345,
        "balance_mm": 248,
        "shape": "redonda",
        "core": "EVA_38_medium",
        "face": "carbon_3k",
        "rim_thickness_mm": 34,
        "surface_roughness": true,
        "holes": { "pattern_type":"radial","n_holes":28, "hole_diameters_mm": [8,8,8,8], "coordinates": [] },
        "safety_checks": { "min_dist_to_edge_mm": 12, "min_dist_between_holes_mm": 9 },
        "confidence": 0.95
      }
    }
  ],

  "post_processing_rules": {
    "clamps": {
      "weight_g": [330,375],
      "balance_mm": [240,290],
      "hole_diameter_mm": [6,12]
    },
    "constraints": {
      "min_dist_to_edge_mm": 10,
      "min_dist_between_holes_mm": 8,
      "max_total_hole_area_ratio": 0.06
    },
    "on_constraint_failure": "auto_adjust (reduce diameters or n_holes up to 3 iterations) or return error with suggestions"
  }
}

/* --------------------------------------------------------------------------
  2) schema.sql
  DDL mínimal para PostgreSQL. Crea tablas principales: users, templates, recommendations,
  geometries, orders, feedbacks.
*/

-- esquema DDL (PostgreSQL)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  hashed_pw VARCHAR(200) NOT NULL,
  club_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  contour_svg TEXT NOT NULL,
  default_params JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  stl_path VARCHAR(1024),
  preview_path VARCHAR(1024),
  status VARCHAR(50) DEFAULT 'pending', -- pending, validated, rejected, manufacturing
  manufacturing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  geometry_id UUID REFERENCES geometries(id) ON DELETE SET NULL,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  factory_status VARCHAR(50) DEFAULT 'queued',
  total_amount_cents INT NOT NULL,
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

/* Indexes y funciones de utilidad */
CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_geometries_status ON geometries(status);

/* Nota: habilitar extension pgcrypto o pguuid según preferencia */

/* --------------------------------------------------------------------------
  3) Mockup React - Single-file component
  - Usa React + TailwindCSS + Three.js (placeholder) para proporcionar un prototipo
    visual que puedas pegar en un proyecto Next.js / Create React App.
  - El componente implementa: Landing + ChatForm + GuidedForm + SVG Hole Editor minimal
*/

import React, { useState, useRef, useEffect } from 'react';

export default function PalaIAConfigurator() {
  const [view, setView] = useState('home');
  const [chatText, setChatText] = useState('');
  const [inputData, setInputData] = useState({
    level: 'medio',
    swing_speed: 'media',
    handed: 'right',
    preferences: { control: 3, power: 3, spin: 3 },
    injuries: ''
  });

  const [recommendation, setRecommendation] = useState(null);
  const [holes, setHoles] = useState([ { x: 120, y: 80, d: 8 }, { x: 140, y: 100, d: 8 } ]);

  // Simula llamada a /api/recommend (en producción llamar a backend que use LLM)
  function fakeRecommend(payload) {
    // heurística rápida conservadora
    const prefersControl = payload.preferences.control >= payload.preferences.power;
    return {
      weight_g: prefersControl ? 345 : 370,
      balance_mm: prefersControl ? 250 : 275,
      shape: prefersControl ? 'redonda' : 'diamante',
      core: prefersControl ? 'EVA_38_medium' : 'EVA_30_hard',
      face: 'carbon_3k',
      rim_thickness_mm: 35,
      surface_roughness: prefersControl,
      holes: { pattern_type: 'radial', n_holes: holes.length, hole_diameters_mm: holes.map(h=>h.d) },
      safety_checks: { min_dist_to_edge_mm: 12, min_dist_between_holes_mm: 8 },
      confidence: 0.85
    };
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    // Enviar al backend → /api/recommend
    // Aquí usamos fakeRecommend
    const payload = { ...inputData, user_text: chatText };
    const rec = fakeRecommend(payload);
    setRecommendation(rec);
    setView('result');
  }

  // SVG Editor handlers
  function addHole() {
    setHoles(h=>[...h, { x: 100, y: 100, d: 8 }]);
  }
  function updateHole(i, patch) {
    setHoles(h=>h.map((hh,idx)=> idx===i ? { ...hh, ...patch } : hh));
  }
  function removeHole(i) {
    setHoles(h=>h.filter((_,idx)=>idx!==i));
  }

  // simple validation: check distances (euclid)
  function checkViolations() {
    const violations = [];
    const minEdge = 12;
    const minBetween = 8;
    const width = 260, height = 350; // plantilla
    holes.forEach((hole,i)=>{
      if (hole.x - hole.d/2 < minEdge || hole.x + hole.d/2 > width - minEdge || hole.y - hole.d/2 < minEdge || hole.y + hole.d/2 > height - minEdge) {
        violations.push({ type: 'edge', index: i });
      }
      for (let j=i+1;j<holes.length;j++){
        const dx = hole.x - holes[j].x; const dy = hole.y - holes[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < (hole.d+holes[j].d)/2 + minBetween) violations.push({ type: 'between', i, j });
      }
    });
    return violations;
  }

  const violations = checkViolations();

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">PalaIA — Crea tu pala con IA</h1>
        <nav className="space-x-2">
          <button onClick={()=>setView('home')} className="px-3 py-1 bg-gray-100 rounded">Inicio</button>
          <button onClick={()=>setView('create')} className="px-3 py-1 bg-blue-600 text-white rounded">Crear pala</button>
        </nav>
      </header>

      {view==='home' && (
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold">Describe tu juego y te generamos la pala perfecta</h2>
            <p className="mt-2 text-gray-700">Sistema híbrido: IA + reglas de seguridad. Patron de agujeros 100% personalizable.</p>
            <div className="mt-4">
              <button onClick={()=>setView('create')} className="px-4 py-2 bg-blue-600 text-white rounded">Empezar</button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded">Ventaja 1<br/><small>Personalización técnica</small></div>
            <div className="p-4 border rounded">Ventaja 2<br/><small>Validación humana</small></div>
            <div className="p-4 border rounded">Ventaja 3<br/><small>Exportación STL lista para fabricar</small></div>
          </div>
        </section>
      )}

      {view==='create' && (
        <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold">Chat / Describe tu juego</h3>
            <form onSubmit={handleChatSubmit} className="mt-2">
              <textarea value={chatText} onChange={e=>setChatText(e.target.value)} rows={6} className="w-full p-2 border rounded" placeholder="Soy zurdo, juego defensivo..." />

              <div className="mt-2 flex gap-2">
                <label className="flex items-center gap-2">Nivel
                  <select value={inputData.level} onChange={e=>setInputData(s=>({...s, level: e.target.value}))} className="ml-2 border rounded p-1">
                    <option value="principiante">Principiante</option>
                    <option value="medio">Medio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">Swing
                  <select value={inputData.swing_speed} onChange={e=>setInputData(s=>({...s, swing_speed: e.target.value}))} className="ml-2 border rounded p-1">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">Zurdo
                  <input type="checkbox" checked={inputData.handed==='left'} onChange={e=>setInputData(s=>({...s, handed: e.target.checked ? 'left' : 'right'}))} className="ml-1" />
                </label>
              </div>

              <div className="mt-2">
                <label className="block">Control / Power</label>
                <div className="flex gap-2 items-center">
                  <input type="range" min="1" max="5" value={inputData.preferences.control} onChange={e=>setInputData(s=>({...s, preferences: {...s.preferences, control: Number(e.target.value)}}))} />
                  <input type="range" min="1" max="5" value={inputData.preferences.power} onChange={e=>setInputData(s=>({...s, preferences: {...s.preferences, power: Number(e.target.value)}}))} />
                </div>
              </div>

              <div className="mt-3">
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Generar recomendación</button>
              </div>
            </form>

            <div className="mt-4">
              <h4 className="font-semibold">Editor de agujeros (básico)</h4>
              <div className="mt-2 flex gap-2">
                <button onClick={addHole} className="px-2 py-1 bg-gray-200 rounded">Añadir agujero</button>
                <button onClick={()=>setHoles([{ x:120,y:80,d:8 }])} className="px-2 py-1 bg-gray-200 rounded">Reset</button>
              </div>

              <div className="mt-2 flex gap-4">
                <svg width="260" height="350" viewBox="0 0 260 350" className="border">
                  <rect x="0" y="0" width="260" height="350" rx="20" fill="#fff" stroke="#ddd" />
                  {/* holes */}
                  {holes.map((h, i)=> (
                    <circle key={i} cx={h.x} cy={h.y} r={h.d/2} fill={violations.find(v=>v.type==='edge' && v.index===i) ? 'rgba(255,0,0,0.6)' : 'rgba(0,0,0,0.2)'} />
                  ))}
                </svg>

                <div className="w-40">
                  <h5 className="font-medium">Lista de agujeros</h5>
                  {holes.map((h,i)=> (
                    <div key={i} className="flex items-center gap-1 border-b py-1">
                      <div className="text-sm">#{i+1}</div>
                      <input type="number" value={h.x} onChange={e=>updateHole(i,{x: Number(e.target.value)})} className="w-16 p-1 border rounded text-sm" />
                      <input type="number" value={h.y} onChange={e=>updateHole(i,{y: Number(e.target.value)})} className="w-16 p-1 border rounded text-sm" />
                      <input type="number" value={h.d} onChange={e=>updateHole(i,{d: Number(e.target.value)})} className="w-12 p-1 border rounded text-sm" />
                      <button onClick={()=>removeHole(i)} className="text-red-500">x</button>
                    </div>
                  ))}

                  <div className="mt-2 text-xs text-red-600">
                    {violations.length>0 ? `${violations.length} violación(es) detectadas (ver círculos rojos)` : 'Sin violaciones detectadas'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div>
            <h3 className="font-semibold">Previsualización / Recomendación</h3>
            <div className="mt-2 p-3 border rounded min-h-[300px]">
              {recommendation ? (
                <div>
                  <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(recommendation, null, 2)}</pre>
                  <div className="mt-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>alert('En producción: llamar /api/generate-geometry con parámetros y enviar a fabricación')}>Exportar STL</button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Genera una recomendación para ver los parámetros técnicos aquí.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {view==='result' && (
        <section className="mt-6">
          <h3 className="font-semibold">Resultado generado</h3>
          <div className="mt-2">
            <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(recommendation, null, 2)}</pre>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>setView('create')} className="px-3 py-1 bg-gray-200 rounded">Volver y ajustar</button>
              <button onClick={()=>alert('Simular checkout') } className="px-3 py-1 bg-green-600 text-white rounded">Comprar</button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

/* --------------------------------------------------------------------------
  FIN DEL ARCHIVO
  - prompts.json: cópialo al gestor de prompts (o archivo .json) para integración con el LLM.
  - schema.sql: ejecuta en tu BDD (ajusta UUID funcs según extensión instalada).
  - Mockup React: pégalo en una página Next.js/CRA; instala Tailwind si quieres el estilo.

  ¿Quieres que genere archivos descargables (.json, .sql, .jsx) listos para descargar aquí?
*/
