# PalaIA - Prototipo\n\nProyecto Next.js + TypeScript + Tailwind con un configurador y backend simulado en `/api/recommend`.\n\nInstrucciones:\n\n```bash\nnpm install\nnpm run dev\n# abrir http://localhost:3000\n```\n

## Integración IA
Este prototipo ahora llama a la API de OpenAI en `/api/recommend`. Debes copiar `.env.local.example` a `.env.local` y añadir tu clave de API.


## Prompt Pack
El archivo `prompts.json` define el prompt del sistema y la plantilla de usuario.
Puedes modificarlo sin tocar el código para cambiar el estilo de recomendación.
