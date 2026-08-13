import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

import { fetchPublicData } from './server/publicData.js'

const KMA_API_BASE = '/api/typ02/openApi/VilageFcstInfoService_2.0'
const KMA_OPERATIONS = {
  current: 'getUltraSrtNcst',
  forecast: 'getVilageFcst',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authKey = env.KMA_API_HUB_KEY?.trim()
  const publicDataKey = env.DATA_GO_KR_SERVICE_KEY?.trim()

  const publicDataDevApi = {
    name: 'public-data-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/public-data', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (!publicDataKey) {
          response.statusCode = 503
          response.end(JSON.stringify({ error: 'DATA_GO_KR_SERVICE_KEY_MISSING' }))
          return
        }

        try {
          const requestUrl = new URL(request.url, 'http://localhost/api/public-data')
          const result = await fetchPublicData(requestUrl, publicDataKey)
          response.statusCode = result.status === 404 ? 200 : result.status
          response.end(JSON.stringify(result.status === 404
            ? { available: false, type: requestUrl.searchParams.get('type') }
            : { available: true, ...result.body }))
        } catch (error) {
          console.warn('[Public Data Dev API unavailable]', error.message)
          const requestUrl = new URL(request.url, 'http://localhost/api/public-data')
          response.statusCode = 200
          response.end(JSON.stringify({ available: false, type: requestUrl.searchParams.get('type') }))
        }
      })
    },
  }

  return {
    plugins: [vue(), publicDataDevApi],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/kma': {
          target: 'https://apihub.kma.go.kr',
          changeOrigin: true,
          rewrite: (path) => {
            const requestUrl = new URL(path, 'http://localhost')
            const operation = KMA_OPERATIONS[requestUrl.searchParams.get('type') ?? 'current']
            requestUrl.searchParams.delete('type')
            if (authKey) requestUrl.searchParams.set('authKey', authKey)
            return `${KMA_API_BASE}/${operation ?? KMA_OPERATIONS.current}?${requestUrl.searchParams.toString()}`
          },
        },
      },
    },
  }
})
