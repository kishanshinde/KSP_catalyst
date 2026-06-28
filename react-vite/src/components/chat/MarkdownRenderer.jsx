import { memo, useMemo } from 'react'

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MarkdownRenderer = memo(function MarkdownRenderer({ content }) {
  const html = useMemo(() => {
    if (!content) return ''

    let text = escapeHtml(content)

    text = text.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1.5">$1</h3>')
    text = text.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    text = text.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')

    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')

    text = text.replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, (_, lang, code) => {
      return `<pre class="bg-surface-container-highest rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>${code.trim()}</code></pre>`
    })

    text = text.replace(/`(.+?)`/g, '<code class="bg-surface-container-highest px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')

    text = text.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    text = text.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')

    text = text.replace(/\|(.+)\|/g, (line) => {
      if (line.includes('---')) return ''
      const cells = line.split('|').filter(Boolean).map((c) => c.trim())
      if (cells.length === 0) return ''
      return `<tr>${cells.map((c) => `<td class="px-3 py-1.5 text-sm border border-slate-200/30">${c}</td>`).join('')}</tr>`
    })
    text = text.replace(/(<tr>.*<\/tr>)+/g, '<table class="w-full my-2 border-collapse">$&</table>')

    text = text.replace(/\n\n/g, '</p><p class="mb-2">')
    text = text.replace(/\n/g, '<br />')

    text = `<p class="mb-2">${text}</p>`

    return text
  }, [content])

  if (!content) return null

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

export default MarkdownRenderer
