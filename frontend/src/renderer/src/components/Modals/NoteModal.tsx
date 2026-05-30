import React, { useState, useEffect } from 'react';

interface NoteModalProps {
  isOpen: boolean;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, initialNote, onSave, onClose }) => {
  const [noteText, setNoteText] = useState(initialNote);

  useEffect(() => {
    setNoteText(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Add Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <textarea
            className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-gray-50 transition-all"
            placeholder="Enter credit details, due date, or any other notes here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          ></textarea>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(noteText)}
            className="px-5 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};
