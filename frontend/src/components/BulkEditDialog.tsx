import { useState } from 'react';

interface BulkEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bulkClass: string, bulkSection: string) => void;
  type: 'inactive' | 'edit';
  selectedCount: number;
}

export default function BulkEditDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  selectedCount
}: BulkEditDialogProps) {
  const [bulkClass, setBulkClass] = useState('');
  const [bulkSection, setBulkSection] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'inactive') {
      onConfirm('', '');
    } else {
      onConfirm(bulkClass, bulkSection);
    }
    setBulkClass('');
    setBulkSection('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
                {type === 'inactive' ? (
                  <div className="bg-orange-100 rounded-full p-2">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                ) : (
                  <div className="bg-blue-100 rounded-full p-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  {type === 'inactive' ? 'Mark Students as Inactive' : 'Edit Students'}
                </h3>
                <div className="mt-2">
                  {type === 'inactive' ? (
                    <p className="text-sm text-gray-500">
                      Are you sure you want to mark {selectedCount} student{selectedCount > 1 ? 's' : ''} as inactive? They will be moved to the inactive students list.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Update class and/or section for {selectedCount} selected student{selectedCount > 1 ? 's' : ''}:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                          <select
                            value={bulkClass}
                            onChange={(e) => setBulkClass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Keep current</option>
                            <option value="Nursery">Nursery</option>
                            <option value="LKG">LKG</option>
                            <option value="UKG">UKG</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                          <select
                            value={bulkSection}
                            onChange={(e) => setBulkSection(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Keep current</option>
                            <option value="REMOVE">Remove section</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                            <option value="D">Section D</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                type === 'inactive' 
                  ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
              onClick={handleConfirm}
            >
              {type === 'inactive' ? 'Mark Inactive' : 'Update Students'}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}