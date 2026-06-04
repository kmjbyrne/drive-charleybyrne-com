let _mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null

function loadMermaid() {
  if (!_mermaidPromise) {
    _mermaidPromise = import('mermaid').then(m => m.default)
  }
  return _mermaidPromise
}

async function renderMermaidIn(root: Element) {
  const mermaid = await loadMermaid()

  const MERMAID_KEYWORDS = [
    'sequenceDiagram', 'graph', 'flowchart', 'gantt',
    'classDiagram', 'stateDiagram', 'erDiagram', 'journey',
    'gitGraph', 'pie', 'requirementDiagram', 'mindmap', 'timeline',
    'quadrantChart', 'xychart', 'sankey', 'block'
  ]

  const blocks = root.querySelectorAll(
    'pre code.language-mermaid, pre code[class*="language-mermaid"], code.language-mermaid, pre:has(code):not([data-mermaid-rendered])'
  )

  for (const element of Array.from(blocks)) {
    const code = element.querySelector('code') || element
    const text = (code.textContent || '').trim()
    // Strip %%{...}%% directives (e.g. init/theme) before checking keywords
    const stripped = text.replace(/^%%\{[^}]*\}%%\s*/g, '')
    if (!MERMAID_KEYWORDS.some(kw => stripped.startsWith(kw))) continue

    const pre = element.tagName === 'PRE' ? element : element.closest('pre')
    if (!pre || pre.hasAttribute('data-mermaid-rendered')) continue

    const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`
    try {
      const { svg } = await mermaid.render(id, text)
      const container = document.createElement('div')
      container.className = 'mermaid-diagram'
      container.innerHTML = svg
      pre.replaceWith(container)
    } catch {
      pre.setAttribute('data-mermaid-error', 'true')
    }
    pre.setAttribute('data-mermaid-rendered', 'true')
  }
}

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  const updateMermaidTheme = async () => {
    const mermaid = await loadMermaid()
    const isDark = colorMode.value === 'dark'
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: isDark,
        background: isDark ? '#27272a' : '#fafafa',
        primaryColor: isDark ? '#3b82f6' : '#2563eb',
        primaryTextColor: isDark ? '#f4f4f5' : '#09090b',
        primaryBorderColor: isDark ? '#52525b' : '#a1a1aa',
        lineColor: '#71717a',
        secondaryColor: isDark ? '#1e293b' : '#e0e7ff',
        tertiaryColor: isDark ? '#312e81' : '#dbeafe',
        textColor: isDark ? '#f4f4f5' : '#09090b',
        mainBkg: isDark ? '#27272a' : '#ffffff',
        secondBkg: isDark ? '#3f3f46' : '#f4f4f5',
        labelTextColor: isDark ? '#f4f4f5' : '#09090b',
        edgeLabelBackground: isDark ? '#27272a' : '#fafafa'
      }
    })
  }

  if (import.meta.client) {
    // Initialize mermaid theme on first load
    updateMermaidTheme()

    // Expose a global function that components can call after rendering markdown
    window.__renderMermaid = () => {
      const panes = document.querySelectorAll('.markdown-preview')
      for (const pane of Array.from(panes)) {
        renderMermaidIn(pane)
      }
    }

    watch(
      () => colorMode.value,
      async () => {
        await updateMermaidTheme()
        document.querySelectorAll('[data-mermaid-rendered]').forEach((el) => {
          el.removeAttribute('data-mermaid-rendered')
        })
        window.__renderMermaid?.()
      }
    )
  }
})

declare global {
  interface Window {
    __renderMermaid?: () => void
  }
}
