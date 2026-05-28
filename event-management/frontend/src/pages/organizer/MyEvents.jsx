import { useState, useEffect } from 'react';
import axios from 'axios';

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, pending, approved, rejected

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/my-events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status.toLowerCase() === filter;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sự Kiện Của Tôi</h1>
        <button 
          onClick={() => window.location.href = '/organizer/create-event'}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          + Tạo Sự Kiện Mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['all', 'draft', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-t-lg font-medium capitalize ${
              filter === f ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
            }`}
          >
            {f === 'all' ? 'Tất cả' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event._id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              {event.banner && (
                <img src={event.banner} alt={event.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-5">
                <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-3 ${getStatusColor(event.status)}`}>
                  {event.status}
                </div>
                
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

                <div className="text-sm text-gray-500">
                  <p>Bắt đầu: {new Date(event.startDateTime).toLocaleDateString('vi-VN')}</p>
                  <p>Kết thúc: {new Date(event.endDateTime).toLocaleDateString('vi-VN')}</p>
                </div>

                {event.rejectionReason && (
                  <p className="mt-3 text-red-600 text-sm">Lý do từ chối: {event.rejectionReason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-10">Chưa có sự kiện nào.</p>
      )}
    </div>
  );
}