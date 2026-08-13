/* D:\IT-Project-2\frontend\app\results\page.tsx */
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  MdZoomIn,
  MdZoomOut,
  MdPanTool,
  MdBrightness6,
  MdContrast,
  MdWarning,
  MdAutoAwesome,
  MdDownload,
  MdCheckCircle,
  MdInvertColors,
} from 'react-icons/md'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PredictionDetail {
  id: number
  patient_id: string
  diagnosis: string
  confidence: number
  created_at: string
  image_url: string
  heatmap_url?: string | null
}

interface RetrievedSource {
  type: 'knowledge' | 'case'
  label: string
  snippet: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: RetrievedSource[]
}

interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [prediction, setPrediction] = useState<PredictionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [invert, setInvert] = useState(false)

  // --- Explainable AI / RAG chat state ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  // --- PDF report state ---
  const [reportGenerating, setReportGenerating] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    fetch(`${API_URL}/api/v1/prediction/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setPrediction(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [id])

  const handleAskQuestion = async () => {
    if (!prediction || !question.trim()) return
    const userMessage: ChatMessage = { role: 'user', content: question.trim() }
    const nextHistory = [...chatHistory, userMessage]
    setChatHistory(nextHistory)
    setQuestion('')
    setChatLoading(true)
    setChatError(null)

    try {
      const res = await fetch(`${API_URL}/api/v1/explain/${prediction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          history: chatHistory,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.detail || 'Failed to get an explanation')
      }
      const data = await res.json()
      setChatHistory([
        ...nextHistory,
        { role: 'assistant', content: data.answer, sources: data.sources || [] },
      ])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setChatLoading(false)
    }
  }

  // Loads an image (possibly cross-origin) onto an offscreen canvas and
  // returns it as a base64 JPEG data URL, optionally with a full color
  // inversion applied via the canvas 2D context's filter.
  const loadImageAsDataUrl = (url: string, invertColors: boolean = false): Promise<LoadedImage> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'))
          return
        }
        if (invertColors) {
          ctx.filter = 'invert(100%)'
        }
        ctx.drawImage(img, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.onerror = () => reject(new Error(`Failed to load image for report: ${url}`))
      img.src = url
    })
  }

  const addImageBlock = (
    doc: jsPDF,
    loaded: LoadedImage | null,
    label: string,
    x: number,
    y: number,
    maxW: number,
    maxH: number
  ) => {
    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(label, x, y)
    const boxY = y + 3

    if (!loaded) {
      doc.setDrawColor(200)
      doc.rect(x, boxY, maxW, maxH)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Not available', x + 4, boxY + maxH / 2)
      return
    }

    const ratio = Math.min(maxW / loaded.width, maxH / loaded.height)
    const w = loaded.width * ratio
    const h = loaded.height * ratio
    doc.addImage(loaded.dataUrl, 'JPEG', x, boxY, w, h)
  }

  const downloadReport = async () => {
    if (!prediction) return
    setReportGenerating(true)
    setReportError(null)

    try {
      const originalUrl = `${API_URL}${prediction.image_url}`
      const heatmapUrl = prediction.heatmap_url ? `${API_URL}${prediction.heatmap_url}` : null

      // Load all 4 image variants in parallel: original, heatmap, and both inverted
      const [originalImg, heatmapImg, invertedOriginalImg, invertedHeatmapImg] = await Promise.all([
        loadImageAsDataUrl(originalUrl, false).catch(() => null),
        heatmapUrl ? loadImageAsDataUrl(heatmapUrl, false).catch(() => null) : Promise.resolve(null),
        loadImageAsDataUrl(originalUrl, true).catch(() => null),
        heatmapUrl ? loadImageAsDataUrl(heatmapUrl, true).catch(() => null) : Promise.resolve(null),
      ])

      const doc = new jsPDF()

      // --- Header ---
      doc.setFontSize(18)
      doc.setTextColor(0)
      doc.text('PneumoniaAI - Diagnostic Report', 14, 22)
      doc.setFontSize(12)
      doc.text(`Patient ID: ${prediction.patient_id}`, 14, 32)
      doc.text(`Date: ${new Date(prediction.created_at).toLocaleString()}`, 14, 38)
      doc.text(`Diagnosis: ${prediction.diagnosis}`, 14, 44)
      doc.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, 14, 50)

      // --- 2x2 image grid: original, heatmap, and both inverted ---
      doc.setFontSize(13)
      doc.text('Diagnostic Images', 14, 60)

      const colW = 85
      const rowH = 65
      const col1X = 14
      const col2X = 105
      const row1Y = 66
      const row2Y = 140

      addImageBlock(doc, originalImg, 'Original X-Ray', col1X, row1Y, colW, rowH)
      addImageBlock(doc, heatmapImg, 'Grad-CAM Heatmap', col2X, row1Y, colW, rowH)
      addImageBlock(doc, invertedOriginalImg, 'Original X-Ray (Inverted)', col1X, row2Y, colW, rowH)
      addImageBlock(doc, invertedHeatmapImg, 'Grad-CAM Heatmap (Inverted)', col2X, row2Y, colW, rowH)

      // --- AI Q&A transcript ---
      let y = row2Y + rowH + 15
      if (y > 260) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(13)
      doc.setTextColor(0)
      doc.text('AI Q&A Session', 14, y)
      y += 8

      if (chatHistory.length === 0) {
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text('No questions were asked during this session.', 14, y)
      } else {
        chatHistory.forEach((m) => {
          const prefix = m.role === 'user' ? 'Q: ' : 'A: '
          doc.setFontSize(10)
          doc.setTextColor(m.role === 'user' ? 20 : 60)
          const lines = doc.splitTextToSize(prefix + m.content, 180)

          if (y + lines.length * 5 > 280) {
            doc.addPage()
            y = 20
          }
          doc.text(lines, 14, y)
          y += lines.length * 5 + 2

          if (m.sources && m.sources.length > 0) {
            const sourceLine = `Sources: ${m.sources.map((s) => s.label).join(', ')}`
            const sourceLines = doc.splitTextToSize(sourceLine, 180)
            doc.setFontSize(8)
            doc.setTextColor(130)
            if (y + sourceLines.length * 4 > 280) {
              doc.addPage()
              y = 20
            }
            doc.text(sourceLines, 14, y)
            y += sourceLines.length * 4 + 3
          } else {
            y += 3
          }
        })
      }

      doc.save(`report_${prediction.patient_id}.pdf`)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to generate the report')
    } finally {
      setReportGenerating(false)
    }
  }

  if (loading) {
    return <div className="text-center text-on-surface-variant py-20">Loading...</div>
  }

  if (!prediction) {
    return <div className="text-center text-on-surface-variant py-20">No prediction found.</div>
  }

  const imageStyle = {
    transform: `scale(${zoom})`,
    filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${invert ? '100%' : '0%'})`,
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5))
  const handleZoomReset = () => setZoom(1)
  const handleBrightnessUp = () => setBrightness((b) => Math.min(b + 10, 200))
  const handleBrightnessDown = () => setBrightness((b) => Math.max(b - 10, 20))
  const handleContrastUp = () => setContrast((c) => Math.min(c + 10, 200))
  const handleContrastDown = () => setContrast((c) => Math.max(c - 10, 20))
  const toggleInvert = () => setInvert((i) => !i)

  return (
    <div className="flex flex-col gap-8">
      {/* Image row: Original + Heatmap side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original X-Ray */}
        <div className="flex flex-col gap-2">
          <h3 className="font-headline-md text-headline-md text-on-surface text-center">Original X‑Ray</h3>
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg border border-outline-variant h-[500px] flex items-center justify-center">
            <img
              className="w-full h-full object-contain transition-all duration-200"
              style={imageStyle}
              src={`${API_URL}${prediction.image_url}`}
              alt="Original Chest X-Ray"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = 'flex items-center justify-center h-full text-on-surface-variant'
                  fallback.innerText = 'Image not found.'
                  parent.appendChild(fallback)
                }
              }}
            />
          </div>
        </div>

        {/* Heatmap */}
        <div className="flex flex-col gap-2">
          <h3 className="font-headline-md text-headline-md text-on-surface text-center">AI Heatmap (Grad‑CAM)</h3>
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg border border-outline-variant h-[500px] flex items-center justify-center">
            {prediction.heatmap_url ? (
              <img
                className="w-full h-full object-contain transition-all duration-200"
                style={imageStyle}
                src={`${API_URL}${prediction.heatmap_url}`}
                alt="Grad-CAM Heatmap"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const fallback = document.createElement('div')
                    fallback.className = 'flex items-center justify-center h-full text-on-surface-variant'
                    fallback.innerText = 'Heatmap not generated.'
                    parent.appendChild(fallback)
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-on-surface-variant">
                Heatmap not generated.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant max-w-fit mx-auto">
        <button onClick={handleZoomIn} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Zoom In">
          <MdZoomIn size={24} />
        </button>
        <button onClick={handleZoomOut} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Zoom Out">
          <MdZoomOut size={24} />
        </button>
        <button onClick={handleZoomReset} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Reset Zoom">
          <MdPanTool size={24} />
        </button>
        <div className="w-px h-6 bg-outline-variant mx-1"></div>
        <button onClick={handleBrightnessUp} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Increase Brightness">
          <MdBrightness6 size={24} />
        </button>
        <button onClick={handleBrightnessDown} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Decrease Brightness">
          <MdBrightness6 size={24} style={{ opacity: 0.5 }} />
        </button>
        <button onClick={handleContrastUp} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Increase Contrast">
          <MdContrast size={24} />
        </button>
        <button onClick={handleContrastDown} className="text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high" title="Decrease Contrast">
          <MdContrast size={24} style={{ opacity: 0.5 }} />
        </button>
        <button
          onClick={toggleInvert}
          className={`text-on-surface hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high ${invert ? 'bg-primary/20' : ''}`}
          title="Invert Colors"
        >
          <MdInvertColors size={24} />
        </button>
      </div>

      {/* Results Panel */}
      <div className="w-full flex flex-col gap-6">
        <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant p-6 flex flex-col gap-4 border-t-4 border-t-error">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Analysis Results</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Patient ID: {prediction.patient_id}</p>
            </div>
            <div
              className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 shadow-sm ${
                prediction.diagnosis === 'PNEUMONIA'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              <MdWarning className="text-[18px]" />
              {prediction.diagnosis === 'PNEUMONIA' ? 'PNEUMONIA DETECTED' : 'NORMAL'}
            </div>
          </div>
          <hr className="border-outline-variant" />
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-variant stroke-current"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                />
                <path
                  className={`stroke-current ${
                    prediction.diagnosis === 'PNEUMONIA' ? 'text-error' : 'text-primary'
                  }`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeDasharray={`${prediction.confidence * 100}, 100`}
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-1">High Confidence</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                The AI model indicates a high probability of {prediction.diagnosis.toLowerCase()} based on radiologic features.
              </p>
            </div>
          </div>

          {/* Explainable AI Chat Panel (RAG-grounded) */}
          <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex flex-col gap-3">
            <h4 className="font-label-md text-label-md text-primary font-semibold mb-1 flex items-center gap-1">
              <MdAutoAwesome className="text-[18px]" /> Ask about this X-ray
            </h4>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {chatHistory.length === 0 && !chatLoading && (
                <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                  Ask a question — e.g. &quot;What does the heatmap highlight?&quot; or &quot;Explain the diagnosis in plain language.&quot;
                </p>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 font-body-sm text-body-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface border border-outline-variant'
                    }`}
                  >
                    {m.content}
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-outline-variant/40 flex flex-wrap gap-1">
                        {m.sources.map((s, si) => (
                          <span
                            key={si}
                            title={s.snippet}
                            className={`text-[10px] px-2 py-0.5 rounded-full border cursor-help ${
                              s.type === 'knowledge'
                                ? 'border-primary/40 text-primary'
                                : 'border-secondary/40 text-secondary'
                            }`}
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-3 py-2 font-body-sm text-body-sm bg-surface-container text-on-surface-variant border border-outline-variant">
                    Analyzing image…
                  </div>
                </div>
              )}
              {chatError && (
                <p className="font-body-sm text-body-sm text-error">{chatError}</p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAskQuestion()
              }}
              className="flex gap-2 mt-1"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this scan..."
                disabled={chatLoading}
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={chatLoading || !question.trim()}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-fixed-dim transition-colors"
              >
                Ask
              </button>
            </form>

            <p className="font-body-sm text-body-sm text-on-surface-variant/70">
              AI-generated explanation for support purposes only — not a clinical diagnosis. Small badges under an answer (e.g. &quot;KB1&quot;, &quot;Case #12&quot;) show which reference notes or past cases informed it — hover to preview.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={downloadReport}
              disabled={reportGenerating}
              className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-3 px-4 rounded-lg hover:bg-primary-fixed-dim transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <MdDownload className="text-[18px]" /> {reportGenerating ? 'Generating…' : 'Download Report'}
            </button>
            <div className="flex-1 bg-surface text-on-surface-variant border border-outline-variant font-label-md text-label-md py-3 px-4 rounded-lg flex justify-center items-center gap-2 opacity-70 cursor-default">
              <MdCheckCircle className="text-[18px] text-green-500" /> Already Saved
            </div>
          </div>
          {reportError && (
            <p className="font-body-sm text-body-sm text-error text-center">{reportError}</p>
          )}
        </div>
      </div>
    </div>
  )
}