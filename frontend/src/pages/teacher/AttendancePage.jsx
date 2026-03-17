import React, { useState, useEffect } from 'react';
import { CheckCircle2, BookMarked, UserCheck, FileUp, FileDown } from 'lucide-react';
import api from '../../utils/axios';

const AttendancePage = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [selectedAttSlot, setSelectedAttSlot] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/teacher/my-subjects')
      .then(res => setSubjects(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      setAttendanceDates([]);
      setSelectedAttSlot(null);
      setAttendanceRecords([]);
      api.get(`/teacher/attendance/${selectedSubjectId}/dates`)
        .then(res => setAttendanceDates(res.data))
        .catch(console.error);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedSubjectId && selectedAttSlot) {
      setAttLoading(true);
      const lId = selectedAttSlot.lab_id || selectedAttSlot.minor_lab_id || '0';
      api.get(`/teacher/attendance/${selectedSubjectId}/lab/${lId}/date/${selectedAttSlot.date}`)
        .then(res => setAttendanceRecords(res.data))
        .catch(console.error)
        .finally(() => setAttLoading(false));
    }
  }, [selectedAttSlot, selectedSubjectId]);

  const toggleAttendance = async (recId) => {
    try {
      const res = await api.put(`/teacher/attendance/${recId}`);
      if (res.data.success) {
        setAttendanceRecords(prev => prev.map(r => r.attendance_id === recId ? { ...r, status: res.data.newStatus } : r));
      }
    } catch(err) { alert('Failed to change attendance'); }
  };

  const markAsHoliday = async () => {
    if (!selectedAttSlot) return;
    try {
      const isMinor = !!selectedAttSlot.minor_lab_id;
      const lId = selectedAttSlot.lab_id || selectedAttSlot.minor_lab_id || null;
      const res = await api.post('/teacher/attendance/holiday', {
        subjectId: selectedSubjectId,
        labId: lId,
        isMinor,
        date: selectedAttSlot.date
      });
      if (res.data.success) {
        // Refresh dates to get holiday flag
        const datesRes = await api.get(`/teacher/attendance/${selectedSubjectId}/dates`);
        setAttendanceDates(datesRes.data);
        // Find the slot again to update local state
        const updated = datesRes.data.find(d => d.date === selectedAttSlot.date && (d.lab_id === selectedAttSlot.lab_id || d.minor_lab_id === selectedAttSlot.minor_lab_id));
        setSelectedAttSlot(updated);
        if (res.data.is_holiday) setAttendanceRecords([]);
      }
    } catch(err) { alert('Failed to toggle holiday'); }
  };
  const handleExport = async () => {
    if (!selectedSubjectId) return;
    try {
      const lId = selectedAttSlot?.lab_id || selectedAttSlot?.minor_lab_id || '0';
      const isMinor = !!selectedAttSlot?.minor_lab_id;
      
      const response = await api.get('/teacher/attendance/excel/export', {
        params: { subjectId: selectedSubjectId, labId: lId, isMinor },
        responseType: 'blob'
      });

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export attendance');
      console.error(err);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Only .xlsx or .xls files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', selectedSubjectId);
    
    // If a slot is selected, use its lab info, else try to find from subjects
    const labId = selectedAttSlot?.lab_id || selectedAttSlot?.minor_lab_id || '0';
    const isMinor = !!selectedAttSlot?.minor_lab_id;
    
    formData.append('labId', labId);
    formData.append('isMinor', isMinor);

    setImporting(true);
    try {
      const res = await api.post('/teacher/attendance/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        alert(`Successfully imported ${res.data.imported} records!`);
        // Refresh dates
        const datesRes = await api.get(`/teacher/attendance/${selectedSubjectId}/dates`);
        setAttendanceDates(datesRes.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to import attendance');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <UserCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Student Attendance</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden min-h-[500px] flex flex-col">
        {/* Subject Selector */}
        <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-6">
          <BookMarked className="w-5 h-5 text-gray-400" />
          <div className="flex-1 flex items-center justify-between">
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full max-w-sm bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 transition-colors font-bold"
            >
              <option value="">-- Select an Assigned Subject --</option>
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_name} {s.class_name ? `(${s.class_name})` : ''} - {s.type.toUpperCase()}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                disabled={!selectedSubjectId || importing}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                Export Excel
              </button>
              
              <label className={`flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-sm hover:shadow-md ${(!selectedSubjectId || importing) ? 'opacity-50 pointer-events-none' : ''}`}>
                <FileUp className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import Excel'}
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleImport}
                />
              </label>
            </div>
          </div>
        </div>

        {!selectedSubjectId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UserCheck className="w-16 h-16 mb-4 text-emerald-100" />
            <p className="font-medium text-lg text-gray-500">Select a subject to view attendance history.</p>
          </div>
        ) : (
          <div className="p-0 flex flex-col md:flex-row h-[600px] flex-1 border border-gray-100 rounded-xl overflow-hidden">
            {/* Sidebar of Dates */}
            <div className="w-full md:w-64 border-r border-gray-100 bg-gray-50/30 overflow-y-auto">
              <div className="p-4 border-b border-gray-100 sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                <h3 className="font-bold text-gray-800 text-sm">Attendance History</h3>
              </div>
              <div className="p-2 space-y-1">
                {attendanceDates.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 p-4">No attendance records found.</p>
                ) : attendanceDates.map((slot, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedAttSlot(slot)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedAttSlot?.date === slot.date && (selectedAttSlot?.lab_id === slot.lab_id || selectedAttSlot?.minor_lab_id === slot.minor_lab_id) ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'hover:bg-white hover:shadow-sm text-gray-600'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      {new Date(slot.date).toLocaleDateString('en-GB')}
                      {slot.is_holiday && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Holiday</span>}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">{slot.lab_name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attendance Details */}
            <div className="flex-1 overflow-y-auto bg-white p-6">
              {!selectedAttSlot ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="font-medium">Select a date and lab to view attendance.</p>
                </div>
              ) : attLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">Loading records...</div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        {new Date(selectedAttSlot.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">{selectedAttSlot.lab_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedAttSlot.is_holiday ? (
                        <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-100">Holiday Marked</div>
                      ) : (
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold flex gap-2 shadow-sm">
                           <span>Total: {attendanceRecords.length}</span>
                           <span className="opacity-40">|</span>
                           <span className="text-emerald-600">Present: {attendanceRecords.filter(r => r.status === 'present').length}</span>
                        </div>
                      )}
                      <button 
                        onClick={markAsHoliday}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedAttSlot.is_holiday ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                         {selectedAttSlot.is_holiday ? 'Recreate as Normal Day' : 'Mark Holiday'}
                      </button>
                    </div>
                  </div>

                  {selectedAttSlot.is_holiday && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><CheckCircle2 className="w-5 h-5" /></div>
                        <div>
                          <p className="text-sm font-bold text-rose-900 uppercase tracking-tight">Holiday Mode Active</p>
                          <p className="text-xs text-rose-500">Records are visible but this day is marked as a holiday in reports.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {attendanceRecords.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic border border-dashed rounded-2xl">No students found in this record.</div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/60 text-gray-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-5 py-3 text-left font-semibold">Roll No</th>
                            <th className="px-5 py-3 text-left font-semibold">Student Name</th>
                            <th className="px-5 py-3 text-center font-semibold text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {attendanceRecords.map(r => (
                            <tr key={r.attendance_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-gray-500 font-medium">{r.roll_no || '—'}</td>
                              <td className="px-5 py-3 font-bold text-gray-900">{r.name}</td>
                              <td className="px-5 py-3 text-center">
                                <button 
                                  onClick={() => toggleAttendance(r.attendance_id)}
                                  className={`w-28 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm'}`}
                                >
                                  {r.status === 'present' ? 'Present' : 'Absent'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
