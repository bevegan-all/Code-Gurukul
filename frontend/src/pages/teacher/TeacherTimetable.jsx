import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import api from '../../utils/axios';

const TeacherTimetable = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/teacher/my-timetable');
      setTimetable(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper to place slots by day
  const slotsByDay = days.reduce((acc, day) => {
    acc[day] = timetable.filter(slot => slot.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-gray-500">Loading timetable...</div>;

  return (
    <div className="space-y-6 animate-slide-in flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-500 mt-1">Your weekly schedule for major and minor lab batches</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map(day => (
            <div key={day} className="bg-gray-50/50 border border-gray-100 rounded-xl p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Calendar className="w-5 h-5 text-primary" /> {day}
              </h2>
              {slotsByDay[day].length === 0 ? (
                <p className="text-sm text-gray-400 italic">No labs scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {slotsByDay[day].map((slot, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${slot.slot_type === 'major' ? 'bg-white border-purple-100 border-l-4 border-l-purple-500 shadow-sm' : 'bg-white border-emerald-100 border-l-4 border-l-emerald-500 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">{slot.subject_name} ({slot.lab_name})</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${slot.slot_type === 'major' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {slot.slot_type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {slot.start_time} - {slot.end_time}
                      </div>
                      {slot.slot_type === 'major' && (
                        <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {slot.class_name}
                        </div>
                      )}
                      {slot.roll_from && slot.roll_to && (
                        <div className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-gray-400" />
                          Roll: {slot.roll_from} - {slot.roll_to}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherTimetable;
