// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    s3: {
      bucket: '',
      region: '',
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: ''
    },
    janus: {
      url: '',
      clientId: '',
      clientSecret: '',
      appIdentifier: ''
    },
    database: {
      path: './data/storage.db'
    },
    authBypass: false,
    storage: {
      driver: 'local',
      quotaBytes: 21474836480
    },
    public: {
      janusUiUrl: '',
      janusClientId: '',
      appUrl: ''
    }
  },

  build: {
    transpile: ['superdoc']
  },

  routeRules: {
    '/': { redirect: '/storage/home' }
  },

  compatibilityDate: '2025-01-15',

  vite: {
    optimizeDeps: {
      exclude: ['superdoc', 'mermaid']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
