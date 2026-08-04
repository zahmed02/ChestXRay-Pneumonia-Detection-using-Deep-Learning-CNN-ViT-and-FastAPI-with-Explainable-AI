'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import {
  MdCloudUpload,
  MdVerified,
  MdWarning,
  MdTrendingUp,
  MdTrendingDown,
  MdDns,
  MdVisibility,
} from 'react-icons/md'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PredictionResponse {
  patient_id: string
  class_name: string
  confidence: number
  heatmap_base64?: string | null
  image_url?: string
}

interface Stats {
  total: number
  normal: number
  pneumonia: number
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, normal: 0, pneumonia: 0 })
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
    fetchRecent()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/stats`)
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch stats', err)
    }
  }

  const fetchRecent = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/history?limit=5`)
      setRecent(res.data.items || [])
    } catch (err) {
      console.error('Failed to fetch recent', err)
    }
  }

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setFile(file)
    setPrediction(null)
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop,
  })

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select an image first')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (patientId.trim()) {
      formData.append('patient_id', patientId.trim())
    }

    setLoading(true)
    try {
      const response = await axios.post<PredictionResponse>(`${API_URL}/api/v1/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPrediction(response.data)
      toast.success('Prediction received!')
      fetchStats()
      fetchRecent()
    } catch (error) {
      console.error(error)
      toast.error('Failed to get prediction. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Toaster position="top-center" />

      <header className="border-b border-outline-variant pb-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">New Chest X-Ray Analysis</h1>
        <p className="font-body-md text-on-surface-variant mt-2">Upload DICOM, JPEG, or PNG files for AI-assisted pneumonia detection.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upload & Result */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-outline-variant rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors cursor-pointer min-h-[300px] relative"
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                // Show image preview
                <div className="relative w-full max-h-64 overflow-hidden rounded-lg">
                  <img src={imagePreview} alt="Preview" className="max-h-64 object-contain mx-auto" />
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-on-surface-variant">Click or drag to replace</p>
                </div>
              ) : (
                // Empty state
                <>
                  <MdCloudUpload className="text-6xl text-primary mb-4 opacity-80" />
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Drag & Drop X-Ray Scans</h3>
                  <p className="font-body-md text-on-surface-variant mb-4">or click to browse local files (JPG, PNG, DICOM)</p>
                  <button className="bg-primary text-on-primary font-label-md px-6 py-2 rounded-lg hover:bg-on-primary-fixed-variant transition-colors">
                    Select Files
                  </button>
                </>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-label-sm text-on-surface-variant bg-surface/50 backdrop-blur-sm p-2 rounded border border-outline-variant/50">
                <span className="flex items-center gap-1">
                  <MdVerified className="text-[16px]" /> HIPAA Compliant
                </span>
                <span>Max file size: 50MB</span>
              </div>
            </div>
          </div>

          {/* Patient ID input */}
          <div className="flex items-center gap-4">
            <label htmlFor="patient-id" className="font-label-md text-on-surface">Patient ID (optional):</label>
            <input
              id="patient-id"
              type="text"
              placeholder="e.g., PX-12345"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="px-8 py-3 bg-primary text-on-primary font-semibold rounded-lg shadow hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed transition relative"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  Scanning...
                </span>
              ) : (
                'Predict Pneumonia'
              )}
            </button>
          </div>

          {/* Prediction Result (unchanged) */}
          {prediction && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm border-t-4 border-t-error">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Analysis Results</h2>
                  <p className="font-body-md text-on-surface-variant">Patient ID: {prediction.patient_id}</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${prediction.class_name === 'PNEUMONIA' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                  <MdWarning className="text-[18px]" />
                  {prediction.class_name === 'PNEUMONIA' ? 'PNEUMONIA DETECTED' : 'NORMAL'}
                </div>
              </div>
              <hr className="border-outline-variant my-4" />
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-variant stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                    <path className={`stroke-current ${prediction.class_name === 'PNEUMONIA' ? 'text-error' : 'text-primary'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${prediction.confidence * 100}, 100`} strokeWidth="3" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-1">High Confidence</h3>
                  <p className="font-body-md text-on-surface-variant">The AI model indicates a high probability of {prediction.class_name.toLowerCase()} based on radiologic features.</p>
                </div>
              </div>
              {prediction.heatmap_base64 && (
                <div className="mt-4">
                  <p className="text-sm text-on-surface-variant">Grad‑CAM Heatmap</p>
                  <img src={prediction.heatmap_base64} alt="Heatmap" className="mt-2 max-w-xs rounded shadow" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Statistics (unchanged) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm border-t-4 border-t-primary">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Today's Statistics</h3>
            <div className="space-y-3">
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center justify-between">
                <div>
                  <p className="font-label-md text-on-surface-variant mb-1">Total Predictions</p>
                  <p className="font-headline-lg text-headline-lg text-on-surface">{stats.total}</p>
                </div>
                <div className="w-16 h-8 bg-surface-variant rounded flex items-end overflow-hidden">
                  <div className="w-1/4 h-[30%] bg-primary mx-px"></div>
                  <div className="w-1/4 h-[60%] bg-primary mx-px"></div>
                  <div className="w-1/4 h-[45%] bg-primary mx-px"></div>
                  <div className="w-1/4 h-[80%] bg-primary mx-px"></div>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>
                <div className="pl-2">
                  <p className="font-label-md text-on-surface-variant mb-1">Normal</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{stats.normal}</p>
                </div>
                <MdTrendingUp className="text-secondary-container text-3xl" />
              </div>
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-error-container"></div>
                <div className="pl-2">
                  <p className="font-label-md text-on-surface-variant mb-1">Pneumonia Detected</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{stats.pneumonia}</p>
                </div>
                <MdTrendingDown className="text-error-container text-3xl" />
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <MdDns className="text-2xl" />
            </div>
            <div>
              <p className="font-label-md text-on-surface">AI Model Status: Online</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">v2.4.1 - Latency: 42ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table (unchanged) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
          <a href="/history" className="text-primary text-label-md hover:underline">View All</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-6 py-2 font-label-md text-on-surface-variant">Patient ID</th>
                <th className="px-6 py-2 font-label-md text-on-surface-variant">Timestamp</th>
                <th className="px-6 py-2 font-label-md text-on-surface-variant">AI Confidence</th>
                <th className="px-6 py-2 font-label-md text-on-surface-variant">Status</th>
                <th className="px-6 py-2 font-label-md text-on-surface-variant text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-on-surface-variant">No predictions yet</td>
                </tr>
              ) : (
                recent.map((item) => (
                  <tr key={item.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-3 font-body-md text-on-surface">{item.patient_id}</td>
                    <td className="px-6 py-3 font-body-md text-on-surface-variant">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 font-body-md text-on-surface-variant">{(item.confidence * 100).toFixed(1)}%</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.diagnosis === 'PNEUMONIA' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                        {item.diagnosis === 'PNEUMONIA' ? 'Pneumonia Detected' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <a href={`/results?id=${item.id}`} className="text-primary hover:text-on-primary-fixed-variant">
                        <MdVisibility className="text-xl" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}