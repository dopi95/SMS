'use client'

import React from 'react'
import { useSettings } from '@/contexts/SettingsContext'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  itemName?: { en: string; am: string }
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = { en: 'students', am: 'ተማሪዎች' }
}: PaginationProps) {
  const { theme, getText } = useSettings()

  if (totalItems === 0 || totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div
      className={`px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t ${
        theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50/70 border-gray-100'
      }`}
    >
      <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        {getText(
          `Showing ${startItem} to ${endItem} of ${totalItems} ${itemName.en}`,
          `ከ ${totalItems} ${itemName.am} ${startItem} እስከ ${endItem} እያሳየ`
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1 ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-200 bg-gray-800 border border-gray-700 active:scale-95'
              : 'hover:bg-gray-100 text-gray-700 bg-white border border-gray-200 active:scale-95 shadow-sm'
          }`}
          title={getText('Previous Page', 'ቀዳሚ ገጽ')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">{getText('Previous', 'ወደ ኋላ')}</span>
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className={`px-2 py-1 text-xs select-none ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
              >
                &hellip;
              </span>
            )
          }

          const pageNum = Number(p)
          const isActive = pageNum === currentPage

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold scale-105'
                  : theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300 bg-gray-800/80 border border-gray-700 active:scale-95'
                  : 'hover:bg-gray-100 text-gray-700 bg-white border border-gray-200 active:scale-95 shadow-sm'
              }`}
            >
              {pageNum}
            </button>
          )
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1 ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-200 bg-gray-800 border border-gray-700 active:scale-95'
              : 'hover:bg-gray-100 text-gray-700 bg-white border border-gray-200 active:scale-95 shadow-sm'
          }`}
          title={getText('Next Page', 'ቀጣይ ገጽ')}
        >
          <span className="hidden sm:inline">{getText('Next', 'ቀጣይ')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
