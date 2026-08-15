<script setup lang="ts">
import { EditorView } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers
} from '@codemirror/view'
import {
  defaultKeymap,
  indentWithTab,
  history,
  historyKeymap
} from '@codemirror/commands'
import {
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
  defaultHighlightStyle
} from '@codemirror/language'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap
} from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import prettier from 'prettier/standalone'
import prettierMarkdown from 'prettier/plugins/markdown'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  mode?: 'markdown' | 'code'
}>()

const isMarkdownMode = computed(() => props.mode !== 'code')

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLElement | null>(null)
const isFormatting = ref(false)
const showLineNumbers = ref(true)

let editorView: EditorView | null = null
const editableCompartment = new Compartment()

const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: '#569cd6' },
  { tag: tags.heading1, color: '#569cd6' },
  { tag: tags.heading2, color: '#569cd6' },
  { tag: tags.heading3, color: '#569cd6' },
  { tag: tags.strong, color: '#ce9178' },
  { tag: tags.emphasis, color: '#ce9178' },
  { tag: tags.link, color: '#4ec9b0' },
  { tag: tags.url, color: '#3b8eea' }
])

onMounted(() => {
  if (!editorContainer.value) return

  const startState = EditorState.create({
    doc: props.modelValue || '',
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter({ openText: '\u25BE', closedText: '\u25B8' }),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection({ eventFilter: (e: MouseEvent) => e.altKey }),
      crosshairCursor({ key: 'Alt' }),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab
      ]),
      ...(isMarkdownMode.value ? [markdown(), syntaxHighlighting(markdownHighlightStyle)] : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),
      EditorView.lineWrapping,
      editableCompartment.of(EditorView.editable.of(!props.disabled)),
      EditorView.theme(
        {
          '&': {
            height: '100%',
            fontSize: '0.9375rem',
            backgroundColor: 'transparent'
          },
          '.cm-scroller': {
            fontFamily: '\'JetBrains Mono\', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            backgroundColor: 'transparent',
            lineHeight: '1.6',
            overflow: 'auto'
          },
          '.cm-content': {
            padding: '1rem',
            caretColor: 'var(--ui-text)'
          },
          '.cm-line': {
            padding: '0 0'
          },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            color: 'var(--ui-text-muted)',
            border: 'none',
            fontFamily: '\'JetBrains Mono\', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'transparent'
          },
          '.cm-activeLine': {
            backgroundColor: 'transparent'
          },
          '.cm-lineNumbers .cm-gutterElement': {
            color: 'var(--ui-text-muted)',
            padding: '0 0.5rem 0 0'
          },
          '.cm-selectionBackground': {
            backgroundColor: 'var(--ui-bg-muted) !important'
          },
          '&.cm-focused .cm-selectionBackground': {
            backgroundColor: 'var(--ui-bg-muted) !important'
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--ui-text)'
          }
        },
        { dark: false }
      )
    ]
  })

  editorView = new EditorView({
    state: startState,
    parent: editorContainer.value
  })
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorView) return
    const currentValue = editorView.state.doc.toString()
    if (newValue !== currentValue) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: newValue }
      })
    }
  }
)

watch(
  () => props.disabled,
  (newValue) => {
    if (!editorView) return
    editorView.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!newValue))
    })
  }
)

onUnmounted(() => {
  editorView?.destroy()
})

defineExpose({
  getScrollElement: () => editorView?.scrollDOM ?? null
})

async function formatMarkdown() {
  if (isFormatting.value || !editorView) return
  isFormatting.value = true
  try {
    const currentContent = editorView.state.doc.toString()
    const formatted = await prettier.format(currentContent, {
      parser: 'markdown',
      plugins: [prettierMarkdown],
      printWidth: 80,
      proseWrap: 'always'
    })
    if (formatted !== currentContent) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: formatted }
      })
    }
  } catch (error) {
    console.error('Failed to format markdown:', error)
  } finally {
    isFormatting.value = false
  }
}

function wrapSelection(before: string, after: string, placeholder: string) {
  if (!editorView) return
  const { state } = editorView
  const { from, to } = state.selection.main
  const selected = state.doc.sliceString(from, to)

  if (selected) {
    if (selected.startsWith(before) && selected.endsWith(after) && selected.length > before.length + after.length) {
      const unwrapped = selected.slice(before.length, -after.length)
      editorView.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length }
      })
    } else {
      const wrapped = `${before}${selected}${after}`
      editorView.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from, head: from + wrapped.length }
      })
    }
  } else {
    const wrapped = `${before}${placeholder}${after}`
    editorView.dispatch({
      changes: { from, insert: wrapped },
      selection: { anchor: from + before.length, head: from + before.length + placeholder.length }
    })
  }
  editorView.focus()
}

function toggleBold() {
  wrapSelection('**', '**', 'bold text')
}

function toggleItalic() {
  wrapSelection('*', '*', 'italic text')
}

function toggleUnderline() {
  wrapSelection('<u>', '</u>', 'underlined text')
}

function insertLink() {
  if (!editorView) return
  const { state } = editorView
  const { from, to } = state.selection.main
  const selected = state.doc.sliceString(from, to)

  if (selected) {
    const text = `[${selected}](url)`
    editorView.dispatch({
      changes: { from, to, insert: text },
      // Select "url" so the user can type the URL immediately
      selection: { anchor: from + selected.length + 2, head: from + selected.length + 5 }
    })
  } else {
    const text = '[link text](url)'
    editorView.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + 1, head: from + 10 }
    })
  }
  editorView.focus()
}

const imageInput = ref<HTMLInputElement | null>(null)

function triggerImageUpload() {
  imageInput.value?.click()
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length || !editorView) return

  const file = input.files[0]!
  input.value = ''

  // Insert a placeholder while uploading
  const { from } = editorView.state.selection.main
  const placeholder = `![Uploading ${file.name}...]()`
  editorView.dispatch({
    changes: { from, insert: placeholder }
  })

  try {
    const { currentSpaceId, currentParentId } = useStorage()
    if (!currentSpaceId.value) return

    // Metadata must precede the file: the server authorises the upload from
    // these fields before the blob starts arriving.
    const formData = new FormData()
    formData.append('spaceId', currentSpaceId.value!)
    if (currentParentId.value) {
      formData.append('parentId', currentParentId.value)
    }
    formData.append('file', file)

    const entry = await $fetch<{ blobKey: string, name: string, ext: string | null }>('/api/storage/upload', {
      method: 'POST',
      body: formData
    })

    const imageUrl = `/api/storage/download?key=${encodeURIComponent(entry.blobKey)}`
    const imageMarkdown = `![${entry.name}${entry.ext || ''}](${imageUrl})`

    // Replace the placeholder with the real image link
    const doc = editorView.state.doc.toString()
    const placeholderIdx = doc.indexOf(placeholder)
    if (placeholderIdx !== -1) {
      editorView.dispatch({
        changes: { from: placeholderIdx, to: placeholderIdx + placeholder.length, insert: imageMarkdown }
      })
    }
  } catch (err) {
    console.error('Failed to upload image:', err)
    // Remove the placeholder on failure
    const doc = editorView.state.doc.toString()
    const placeholderIdx = doc.indexOf(placeholder)
    if (placeholderIdx !== -1) {
      editorView.dispatch({
        changes: { from: placeholderIdx, to: placeholderIdx + placeholder.length, insert: '' }
      })
    }
  }
}

function insertHeading(level: 1 | 2 | 3 | 4 | 5) {
  if (!editorView) return
  const { state } = editorView
  const { from } = state.selection.main
  const hashes = '#'.repeat(level)
  const line = state.doc.lineAt(from)
  const headingPattern = /^(#{1,6})\s+(.*)$/
  const match = line.text.match(headingPattern)

  let newText: string
  let cursorPos: number

  if (line.text.trim() === '') {
    const ph = `Heading ${level}`
    newText = `${hashes} ${ph}`
    cursorPos = line.from + hashes.length + 1 + ph.length
  } else if (match) {
    if (match[1]!.length === level) {
      newText = match[2]!
      cursorPos = line.from + newText.length
    } else {
      newText = `${hashes} ${match[2]!}`
      cursorPos = line.from + newText.length
    }
  } else {
    newText = `${hashes} ${line.text}`
    cursorPos = line.from + newText.length
  }

  editorView.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
    selection: { anchor: cursorPos }
  })
  editorView.focus()
}
</script>

<template>
  <div
    class="markdown-editor border border-default rounded-lg overflow-hidden flex flex-col h-full"
    :class="{ 'opacity-60 pointer-events-none': disabled }"
  >
    <!-- Toolbar -->
    <div class="flex items-center justify-between p-2 border-b border-default bg-elevated shrink-0">
      <div
        v-if="isMarkdownMode"
        class="flex items-center gap-1 flex-wrap"
      >
        <UButton
          icon="i-lucide-bold"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Bold"
          @click="toggleBold"
        />
        <UButton
          icon="i-lucide-italic"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Italic"
          @click="toggleItalic"
        />
        <UButton
          icon="i-lucide-underline"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Underline"
          @click="toggleUnderline"
        />
        <div class="h-4 w-px bg-default" />
        <UButton
          icon="i-lucide-heading-1"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Heading 1"
          @click="insertHeading(1)"
        />
        <UButton
          icon="i-lucide-heading-2"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Heading 2"
          @click="insertHeading(2)"
        />
        <UButton
          icon="i-lucide-heading-3"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Heading 3"
          @click="insertHeading(3)"
        />
        <UButton
          icon="i-lucide-heading-4"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Heading 4"
          @click="insertHeading(4)"
        />
        <UButton
          icon="i-lucide-heading-5"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Heading 5"
          @click="insertHeading(5)"
        />
        <div class="h-4 w-px bg-default" />
        <UButton
          icon="i-lucide-link"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Insert Link"
          @click="insertLink"
        />
        <UButton
          icon="i-lucide-image"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          title="Insert Image"
          @click="triggerImageUpload"
        />
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onImageSelected"
        >
      </div>
      <div
        v-else
        class="flex items-center gap-1"
      >
        <UIcon
          name="i-lucide-code-2"
          class="size-3.5 text-dimmed"
        />
        <span class="text-xs text-muted">Code</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <UButton
          :icon="showLineNumbers ? 'i-lucide-list-ordered' : 'i-lucide-list-x'"
          color="neutral"
          :variant="showLineNumbers ? 'soft' : 'ghost'"
          size="xs"
          :title="showLineNumbers ? 'Hide line numbers' : 'Show line numbers'"
          @click="showLineNumbers = !showLineNumbers"
        />
        <UButton
          v-if="isMarkdownMode"
          icon="i-lucide-wand-sparkles"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="isFormatting || disabled"
          :loading="isFormatting"
          title="Format with Prettier"
          @click="formatMarkdown"
        />
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <div
        ref="editorContainer"
        class="h-full overflow-auto"
        :class="{ 'hide-line-numbers': !showLineNumbers }"
      />
    </div>
  </div>
</template>

<style scoped>
.hide-line-numbers :deep(.cm-gutters) {
  display: none !important;
}
</style>
