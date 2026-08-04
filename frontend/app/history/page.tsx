'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MdDownload,
  MdSearch,
  MdCalendarMonth,
  MdFilterList,
  MdVisibility,
  MdArrowForward,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface HistoryItem {
  id: number
  patient_id: string
  diagnosis: string
  confidence: number
  created_at: string
  image_url: string
}

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [diagnosisFilter, setDiagnosisFilter] = useState('All Diagnoses')
  const [currentPage, setCurrentPage] = useState(1)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const limit = 10

  useEffect(() => {
    fetchHistory()
  }, [search, diagnosisFilter, currentPage])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      })
      if (search.trim()) params.append('patient_id', search.trim())
      if (diagnosisFilter !== 'All Diagnoses') params.append('diagnosis', diagnosisFilter)
      const res = await fetch(`${API_URL}/api/v1/history?${params}`)
      const data = await res.json()
      setHistory(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (err) {
      console.error('Failed to fetch history', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    // Generate CSV from current filtered data
    const headers = ['Patient ID', 'Date/Time', 'Diagnosis', 'Confidence']
    const rows = history.map(item => [
      item.patient_id,
      new Date(item.created_at).toLocaleString(),
      item.diagnosis,
      (item.confidence * 100).toFixed(1) + '%',
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'history_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">Patient History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Review past diagnostic analysis and reports.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <MdDownload className="text-[18px]" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search Patient ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-on-surface-variant/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select
                value={diagnosisFilter}
                onChange={(e) => {
                  setDiagnosisFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="appearance-none pl-4 pr-10 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
              >
                <option>All Diagnoses</option>
                <option>NORMAL</option>
                <option>PNEUMONIA</option>
              </select>
              <MdFilterList className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant">
                <th className="py-3 px-4 font-medium">Patient ID</th>
                <th className="py-3 px-4 font-medium">Date/Time</th>
                <th className="py-3 px-4 font-medium">Diagnosis</th>
                <th className="py-3 px-4 font-medium">Confidence</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-on-surface-variant">Loading...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-on-surface-variant">No records found</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-primary">{item.patient_id}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-md text-label-md ${
                        item.diagnosis === 'PNEUMONIA'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {item.diagnosis === 'PNEUMONIA' ? 'Pneumonia' : 'Normal'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(item.confidence * 100).toFixed(1)}%</span>
                        <div className="w-24 h-1 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.diagnosis === 'PNEUMONIA' ? 'bg-error' : 'bg-primary'}`} style={{ width: `${item.confidence * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/results?id=${item.id}`} className="inline-flex items-center gap-1 text-primary hover:text-primary-fixed-dim font-label-md text-label-md transition-colors">
                        View Report
                        <MdArrowForward className="text-[18px]" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex items-center justify-between">
          <span className="font-body-md text-body-md text-on-surface-variant">
            Showing {history.length > 0 ? (currentPage - 1) * limit + 1 : 0} to {Math.min(currentPage * limit, total)} of {total} results
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdChevronLeft />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5) {
                if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded font-label-md text-label-md flex items-center justify-center ${
                    currentPage === pageNum
                      ? 'bg-primary text-on-primary'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}