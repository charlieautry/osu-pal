import React from 'react';
import { termForDate } from '../../lib/term';

interface DocumentRowProps {
  row: any;
  isEditing: boolean;
  editData: any;
  openMenuId: string | null;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditDataChange: (data: any) => void;
  onToggleMenu: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onCloseMenu: () => void;
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  row: r,
  isEditing,
  editData,
  openMenuId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditDataChange,
  onToggleMenu,
  onDownload,
  onDelete,
  onCloseMenu,
}) => {
  const rowId = r.id ?? r.path;

  return (
    <div className="flex items-center border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors min-w-[600px] py-2 sm:py-3">
      {/* Title Column */}
      <div className="px-3 sm:px-6 flex-1" style={{ minWidth: '200px' }}>
        {isEditing ? (
          <input
            className="w-full text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={editData.title}
            onChange={(e) => onEditDataChange({ ...editData, title: e.target.value })}
          />
        ) : (
          <>
            <div className="font-medium text-xs sm:text-sm">{r.title ?? r['title'] ?? 'Untitled'}</div>
            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">{r.path}</div>
          </>
        )}
      </div>

      {/* Course Column */}
      <div className="px-3 sm:px-6 flex-1" style={{ minWidth: '180px' }}>
        {isEditing ? (
          <div className="space-y-1">
            <div className="flex gap-1">
              <input
                className="w-16 text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Code"
                value={editData.course_code}
                onChange={(e) => onEditDataChange({ ...editData, course_code: e.target.value })}
              />
              <input
                className="w-16 text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Number"
                value={editData.course_number}
                onChange={(e) => onEditDataChange({ ...editData, course_number: e.target.value })}
              />
            </div>
            <input
              className="w-full text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Course Name"
              value={editData.course_name}
              onChange={(e) => onEditDataChange({ ...editData, course_name: e.target.value })}
            />
          </div>
        ) : (
          <>
            <div className="font-medium text-xs sm:text-sm">{r['course code']} {r['course number']}</div>
            <div className="text-xs text-slate-500 mt-0.5">{r['course name'] ?? r.course_name}</div>
          </>
        )}
      </div>

      {/* Professor Column */}
      <div className="px-3 sm:px-6 flex-1 text-xs sm:text-sm" style={{ minWidth: '150px' }}>
        {isEditing ? (
          <input
            className="w-full text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={editData.professor}
            onChange={(e) => onEditDataChange({ ...editData, professor: e.target.value })}
          />
        ) : (
          r.professor
        )}
      </div>

      {/* Date Column */}
      <div className="px-3 sm:px-6" style={{ minWidth: '120px' }}>
        {isEditing ? (
          <input
            type="date"
            className="w-full text-xs sm:text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={editData.date}
            onChange={(e) => onEditDataChange({ ...editData, date: e.target.value })}
          />
        ) : (
          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{termForDate(r.date)}</span>
        )}
      </div>

      {/* Actions Column */}
      <div className="px-3 sm:px-6" style={{ minWidth: '80px' }}>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onSaveEdit}
              className="p-1.5 sm:p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 
                       focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              title="Save"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 sm:w-5 h-4 sm:h-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 
                       focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
              title="Cancel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 sm:w-5 h-4 sm:h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={onToggleMenu}
              className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 
                       focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
              title="Actions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 sm:w-5 h-4 sm:h-5">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>
            
            {openMenuId === rowId && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={onCloseMenu}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <button
                    onClick={onDownload}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={onStartEdit}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={onDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
