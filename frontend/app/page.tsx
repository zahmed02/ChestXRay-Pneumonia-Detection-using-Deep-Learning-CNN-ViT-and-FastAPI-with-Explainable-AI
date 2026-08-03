'use client'

import { useState } from 'react'
import axios from 'axios'
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'

interface PredictionResponse {
  class_name: string
  confidence: number
  heatmap_base64?: string | null
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setFile(file)
    setPrediction(null)
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

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await axios.post<PredictionResponse>(`${apiUrl}/api/v1/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPrediction(response.data)
      toast.success('Prediction received!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to get prediction. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <Toaster position="top-center" />
      <h1 className="text-4xl font-bold text-center text-blue-700 mb-4">
        🩻 Pneumonia Detection
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Upload a chest X‑ray image and get an AI‑powered diagnosis.
      </p>

      {/* Upload area */}
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors bg-white"
      >
        <input {...getInputProps()} />
        {file ? (
          <div>
            <p className="text-green-600 font-medium">📎 {file.name}</p>
            <p className="text-sm text-gray-500">Click or drag to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">Drag & drop an X‑ray image here</p>
            <p className="text-sm text-gray-400">or click to browse</p>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Analyzing...' : 'Predict Pneumonia'}
        </button>
      </div>

      {/* Results */}
      {prediction && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold">Result</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Prediction</p>
              <p className={`text-2xl font-bold ${prediction.class_name === 'PNEUMONIA' ? 'text-red-600' : 'text-green-600'}`}>
                {prediction.class_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confidence</p>
              <p className="text-2xl font-bold text-blue-600">
                {(prediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          {prediction.heatmap_base64 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Grad‑CAM Heatmap</p>
              <img src={prediction.heatmap_base64} alt="Heatmap" className="mt-2 max-w-xs rounded shadow" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}