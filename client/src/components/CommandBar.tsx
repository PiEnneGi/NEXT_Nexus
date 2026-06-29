import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Paperclip, Send, X } from 'lucide-react'

interface Props {
  onSend: (text: string, fileSessionId?: string) => void
  disabled?: boolean
}

interface AttachedFile {
  id: string
  file: File
  name: string
  type: string
  size: number
  preview?: string
  status: 'ready' | 'uploading' | 'done' | 'error'
  error?: string
}

const ALLOWED_EXTENSIONS = [
  '.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.toml', '.ini', '.xml', '.log',
  '.pdf',
  '.docx', '.doc',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
]

const MAX_FILE_SIZE = 20 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFileEmoji(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext ?? '')) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext ?? '')) return '📝'
  if (['md', 'txt'].includes(ext ?? '')) return '📝'
  if (['json', 'yaml', 'yml', 'xml', 'toml', 'ini'].includes(ext ?? '')) return '⚙️'
  if (['csv', 'log'].includes(ext ?? '')) return '📊'
  return '📎'
}

function isAllowedFile(file: File): { allowed: boolean; reason?: string } {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { allowed: false, reason: `Unsupported file type: ${ext}` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { allowed: false, reason: `File too large: ${formatSize(file.size)} (max ${formatSize(MAX_FILE_SIZE)})` }
  }
  return { allowed: true }
}

export function CommandBar({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const LINE_HEIGHT = 20
  const MAX_VISIBLE_LINES = 5

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, MAX_VISIBLE_LINES * LINE_HEIGHT) + 'px'
    }
  }, [input])

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = []
    for (const file of Array.from(fileList)) {
      const check = isAllowedFile(file)
      if (!check.allowed) continue
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }
      newFiles.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview,
        status: 'ready',
      })
    }
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault()
      addFiles(e.clipboardData.files)
    }
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }, [addFiles])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if ((!trimmed && files.length === 0) || disabled || uploading) return

    if (files.length === 0) {
      onSend(trimmed)
      setInput('')
      return
    }

    setUploading(true)

    setFiles((prev) => prev.map((f) => f.status === 'ready' ? { ...f, status: 'uploading' as const } : f))

    try {
      const textFileContents: string[] = []
      let fileSessionId: string | undefined

      for (const af of files) {
        if (af.type.startsWith('text/') || af.name.endsWith('.md') || af.name.endsWith('.svg')) {
          const content = await af.file.text()
          textFileContents.push(`--- ${af.name} ---\n${content}\n`)
          setFiles((prev) => prev.map((f) => f.id === af.id ? { ...f, status: 'done' as const } : f))
        } else {
          const formData = new FormData()
          formData.append('file', af.file)
          const res = await fetch('/upload', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Upload failed' }))
            throw new Error(err.error ?? `Upload failed: ${res.statusText}`)
          }
          const data = await res.json()
          fileSessionId = data.sessionId
          setFiles((prev) => prev.map((f) => f.id === af.id ? { ...f, status: 'done' as const } : f))
        }
      }

      let message = trimmed
      if (textFileContents.length > 0) {
        message += '\n\n--- Attached Files ---\n' + textFileContents.join('\n')
      }

      onSend(message, fileSessionId)
      setInput('')
      setFiles([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, status: 'error' as const, error: msg } : f))
    } finally {
      setUploading(false)
    }
  }, [input, files, disabled, uploading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasFiles = files.length > 0

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50"
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col bg-[#0D0D0D] border rounded-xl shadow-2xl transition-colors ${
          isDragOver
            ? 'border-[#FF6B00] border-dashed'
            : 'border-[#1A1A1A]'
        }`}
      >
        {hasFiles && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
            {files.map((af) => (
              <div
                key={af.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border text-white ${
                  af.status === 'error'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-[#2A2A2A] bg-[#1A1A1A]'
                }`}
              >
                {af.preview ? (
                  <img src={af.preview} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <span className="text-sm leading-none">{getFileEmoji(af.name)}</span>
                )}
                <span className="max-w-[120px] truncate">{af.name}</span>
                <span className="text-gray-500 shrink-0">{formatSize(af.size)}</span>
                {af.status === 'uploading' && (
                  <span className="w-3 h-3 border border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                )}
                {af.status === 'error' && (
                  <span className="text-red-400 text-[10px]" title={af.error}>err</span>
                )}
                <button
                  onClick={() => removeFile(af.id)}
                  className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0"
                  disabled={af.status === 'uploading'}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileRef.current?.click()}
            className={`p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors ${
              isDragOver ? 'text-[#FF6B00]' : ''
            }`}
            title={isDragOver ? 'Drop files here' : 'Attach files'}
            disabled={disabled}
          >
            <Paperclip size={16} />
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isDragOver
                ? 'Drop files here...'
                : hasFiles
                  ? 'Add a message or send files...'
                  : 'Describe the infrastructure architecture...'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none font-mono resize-none overflow-y-auto"
            disabled={disabled}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && files.length === 0) || uploading}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              uploading
                ? 'bg-[#FF6B00]/50 text-white'
                : 'bg-[#FF6B00] text-white hover:bg-[#e55f00]'
            }`}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
