'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import { MdArrowForward, MdCloudUpload, MdDns, MdImageSearch, MdOpenInNew, MdShield, MdWarning } from 'react-icons/md'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
interface Prediction { patient_id: string; class_name: string; confidence: number; heatmap_base64?: string | null }
interface Stats { total: number; normal: number; pneumonia: number }
interface Recent { id: number; patient_id: string; diagnosis: string; confidence: number; created_at: string }

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, normal: 0, pneumonia: 0 })
  const [recent, setRecent] = useState<Recent[]>([])
  const [loading, setLoading] = useState(false)
  const [serviceError, setServiceError] = useState(false)

  const refreshOverview = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([axios.get(`${API_URL}/api/v1/stats`), axios.get(`${API_URL}/api/v1/history?limit=5`)]);
      setStats(statsRes.data); setRecent(historyRes.data.items || []); setServiceError(false)
    } catch { setServiceError(true) }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void refreshOverview() }, 0); return () => window.clearTimeout(timer) }, [])

  const onDrop = (files: File[]) => {
    const next = files[0]; if (!next) return
    setFile(next); setPrediction(null)
    const reader = new FileReader(); reader.onload = () => setPreview(String(reader.result)); reader.readAsDataURL(next)
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/dicom': ['.dcm'] }, maxFiles: 1, maxSize: 50 * 1024 * 1024, onDrop, onDropRejected: () => toast.error('Use a JPG, PNG, or DICOM image up to 50 MB.') })

  const submit = async () => {
    if (!file) return toast.error('Choose an X-ray image before starting an analysis.')
    const data = new FormData(); data.append('file', file); if (patientId.trim()) data.append('patient_id', patientId.trim())
    setLoading(true); setServiceError(false)
    try { const res = await axios.post<Prediction>(`${API_URL}/api/v1/predict`, data); setPrediction(res.data); await refreshOverview(); toast.success('Analysis complete') }
    catch { setServiceError(true); toast.error('The analysis service could not be reached.') }
    finally { setLoading(false) }
  }

  return <div className="flex flex-col gap-8"><Toaster position="top-center" />
    <section className="surface-grid relative overflow-hidden rounded-3xl border bg-card px-6 py-8 sm:px-10 lg:py-10">
      <div className="relative max-w-3xl"><p className="eyebrow">AI-assisted radiology workflow</p><h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Review a chest X-ray with clarity.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Upload one image to receive a pneumonia classification, confidence score, and model attention view for review.</p></div>
      <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground"><span className="rounded-full bg-secondary px-3 py-2 text-secondary-foreground">Private workflow</span><span className="rounded-full bg-muted px-3 py-2">JPG · PNG · DICOM</span><span className="rounded-full bg-muted px-3 py-2">Max 50 MB</span></div>
    </section>
    {serviceError && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><MdDns className="mt-0.5 shrink-0 text-destructive" /><span><strong>Analysis service unavailable.</strong> Start the FastAPI backend, then retry this request.</span></div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="clinical-card p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Step 01</p><h2 className="mt-1 text-2xl font-bold">Add an X-ray</h2></div><MdImageSearch className="text-3xl text-primary" /></div>
        <div {...getRootProps()} className={`flex min-h-[290px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${isDragActive ? 'border-primary bg-secondary' : 'border-border bg-muted/40 hover:border-primary hover:bg-secondary/50'}`}><input {...getInputProps()} />{preview ? <><img src={preview} alt="Selected chest X-ray preview" className="max-h-56 max-w-full rounded-xl object-contain" /><p className="mt-4 text-sm font-semibold text-primary">Click or drop another image to replace</p></> : <><span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary"><MdCloudUpload className="text-4xl" /></span><h3 className="text-lg font-bold">Drop an image here</h3><p className="mt-2 text-sm text-muted-foreground">or select a file from your device</p><span className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Browse files</span></>}</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="flex flex-col gap-2 text-sm font-semibold">Patient ID <span className="font-normal text-muted-foreground">Optional reference for your report</span><input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="e.g. PX-12345" className="h-11 rounded-xl border bg-background px-3 font-normal outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" /></label><button onClick={submit} disabled={!file || loading} className="h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">{loading ? 'Analyzing…' : 'Run analysis'}<MdArrowForward className="ml-2 inline" /></button></div>
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><MdShield className="text-primary" /> Use de-identified images and follow your organization&apos;s data handling policy.</p>
      </section>
      <aside className="flex flex-col gap-6"><section className="clinical-card p-6"><p className="eyebrow">Workspace overview</p><h2 className="mt-1 text-xl font-bold">Review activity</h2><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-muted p-3"><strong className="block text-2xl">{stats.total}</strong><span className="text-[11px] text-muted-foreground">Total</span></div><div className="rounded-xl bg-secondary p-3"><strong className="block text-2xl text-secondary-foreground">{stats.normal}</strong><span className="text-[11px] text-muted-foreground">Normal</span></div><div className="rounded-xl bg-destructive/10 p-3"><strong className="block text-2xl text-destructive">{stats.pneumonia}</strong><span className="text-[11px] text-muted-foreground">Flagged</span></div></div></section><section className="clinical-card p-6"><div className="flex items-start gap-3"><MdWarning className="mt-0.5 text-warning" /><div><h3 className="font-bold">Review responsibly</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Model output is an aid for review. Confirm findings with qualified clinical judgment.</p></div></div></section></aside>
    </div>
    {prediction && <section className={`clinical-card overflow-hidden border-t-4 ${prediction.class_name === 'PNEUMONIA' ? 'border-t-destructive' : 'border-t-primary'}`}><div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Step 02 · Result ready</p><h2 className="mt-1 text-2xl font-bold">{prediction.class_name === 'PNEUMONIA' ? 'Pneumonia flagged' : 'No pneumonia flagged'}</h2><p className="mt-2 text-sm text-muted-foreground">Patient ID: {prediction.patient_id} · Model confidence {Math.round(prediction.confidence * 1000) / 10}%</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-4 py-2 text-sm font-bold ${prediction.class_name === 'PNEUMONIA' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>{Math.round(prediction.confidence * 100)}% confidence</span><Link href={`/results?id=${prediction.patient_id}`} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Open report <MdOpenInNew className="ml-1 inline" /></Link></div></div>{prediction.heatmap_base64 && <div className="border-t bg-muted/40 px-6 py-4 text-sm text-muted-foreground">A model attention heatmap is available in the full report.</div>}</section>}
    <section className="clinical-card overflow-hidden"><div className="flex items-center justify-between border-b px-6 py-5"><div><p className="eyebrow">Recent activity</p><h2 className="mt-1 text-xl font-bold">Latest analyses</h2></div><Link href="/history" className="text-sm font-bold text-primary hover:underline">View history <MdArrowForward className="ml-1 inline" /></Link></div><div className="overflow-x-auto">{recent.length ? <table className="w-full text-left text-sm"><thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Patient ID</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Finding</th><th className="px-6 py-3 text-right">Report</th></tr></thead><tbody>{recent.map(item => <tr key={item.id} className="border-t hover:bg-muted/40"><td className="px-6 py-4 font-semibold">{item.patient_id}</td><td className="px-6 py-4 text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td><td className="px-6 py-4">{item.diagnosis === 'PNEUMONIA' ? <span className="font-semibold text-destructive">Pneumonia flagged</span> : <span className="font-semibold text-primary">Normal</span>}</td><td className="px-6 py-4 text-right"><Link href={`/results?id=${item.id}`} className="font-bold text-primary hover:underline">Open</Link></td></tr>)}</tbody></table> : <div className="p-8 text-center text-sm text-muted-foreground">No analyses yet. Your completed reports will appear here.</div>}</div></section>
  </div>
}
