import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookMarked, ArrowLeft, FileCode2, NotebookPen } from 'lucide-react';
import api from '../../utils/axios';

const SubjectDetail = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Parse deep link tab from query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'assignments';

  // State to handle which sub-tab we are viewing
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab state with URL without causing full re-navs
  useEffect(() => {
    navigate(`?tab=${activeTab}`, { replace: true });
  }, [activeTab, navigate]);

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const res = await api.get(`/student/subjects/${subjectId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubject();
  }, [subjectId]);

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading subject...</div>;
  if (!data) return <div className="p-8 text-red-500">Subject not found or access denied.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
        <button 
          onClick={() => navigate('/student/subjects')}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-1.5 rounded-lg ${data.type === 'major' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
              <BookMarked className={`w-4 h-4 ${data.type === 'major' ? 'text-blue-600' : 'text-emerald-500'}`} />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${data.type === 'major' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {data.type}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {data.name}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Instructor: <span className="text-gray-900">{data.teacher_name}</span>
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-gray-100/50 p-1.5 rounded-2xl w-max border border-gray-200/50 shadow-sm relative z-0">
        {[
          { id: 'assignments', label: 'Lab Assignments', icon: FileCode2, count: data.assignments?.length },
          { id: 'notes', label: 'Notes', icon: NotebookPen, count: data.notes?.length }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
              activeTab === t.id 
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-blue-500' : 'opacity-60'}`} />
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-md ${
                activeTab === t.id ? 'bg-blue-50 text-blue-700' : 'bg-gray-200 text-gray-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="mt-6">
        {activeTab === 'assignments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.assignments?.length === 0 ? (
               <div className="col-span-1 border-dashed border-2 border-gray-200 p-10 text-center rounded-2xl bg-white text-gray-500 w-full">
                 No assignments available yet.
               </div>
            ) : (
              data.assignments?.map(a => (
                <div 
                  key={a.id} 
                  onClick={() => navigate(`/student/assignments/${a.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-3">{a.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold uppercase tracking-wider">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.compiler_required}</span>
                      {a.time_limit_minutes && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a.time_limit_minutes} min limit</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
           </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {data.notes?.length === 0 ? (
               <div className="col-span-1 border-dashed border-2 border-gray-200 p-10 text-center rounded-2xl bg-white text-gray-500 w-full">
                 No notes available yet.
               </div>
            ) : (
              data.notes?.map(n => (
                <div key={n._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-lg">{n.title}</h3>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <NotebookPen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="prose prose-sm prose-blue max-w-none text-gray-600 line-clamp-6"
                    dangerouslySetInnerHTML={{ __html: n.content_html }}
                  />
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => navigate(`/student/notes/${n._id}`)}
                      className="text-emerald-600 font-semibold text-sm hover:text-emerald-800 transition-colors"
                    >
                      Read Full Note →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default SubjectDetail;
