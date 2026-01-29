import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'orange' | 'blue';
  icon: React.ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmColor,
  icon
}: ConfirmDialogProps) {
  const { theme, getText } = useSettings();
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    orange: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className={`fixed inset-0 bg-opacity-75 transition-opacity ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-500'}`} onClick={onClose}></div>
        
        <div className={`relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`px-4 pb-4 pt-5 sm:p-6 sm:pb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
                {icon}
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className={`text-base font-semibold leading-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${colorClasses[confirmColor]} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className={`mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset sm:mt-0 sm:w-auto ${theme === 'dark' ? 'bg-gray-600 text-gray-200 ring-gray-500 hover:bg-gray-500' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'}`}
              onClick={onClose}
            >
              {getText('Cancel', 'ይሰርዙ')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}