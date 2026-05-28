import { useState, useEffect } from 'react';
import axios from 'axios';

export default function EventApproval() {
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPendingEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Xác nhận phê duyệt sự kiện này?')) return;
    
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Phê duyệt thành công!');
      fetchPendingEvents();
      setSelectedEvent(null);
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}/reject`, 
        { rejectionReason }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Đã từ chối sự kiện');
      fetchPendingEvents();
      setSelectedEvent(null);
      setRejectionReason('');
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Phê Duyệt Sự Kiện</h1>

      {loading ? <p>Đang tải...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Danh sách sự kiện chờ duyệt */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Danh sách chờ phê duyệt ({pendingEvents.length})</h2>
            {pendingEvents.map(event => (
              <div 
                key={event._id} 
                onClick={() => setSelectedEvent(event)}
                className="bg-white border p-5 rounded-xl mb-4 cursor-pointer hover:shadow-md transition"
              >
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Tổ chức bởi: {event.organizer?.fullName}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(event.startDateTime).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
          </div>

          {/* Chi tiết & Phê duyệt */}
          <div className="bg-white border rounded-xl p-6 sticky top-6">
            {selectedEvent ? (
              <>
                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
                <p className="text-gray-700 mb-6">{selectedEvent.description}</p>

                <div className="mb-6">
                  <h4 className="font-medium mb-2">Tài liệu xác minh:</h4>
                  {selectedEvent.verificationDocuments?.length > 0 ? (
                    <ul className="list-disc pl-5 text-blue-600">
                      {selectedEvent.verificationDocuments.map((doc, i) => (
                        <li key={i}>{doc.fileName}</li>
                      ))}
                    </ul>
                  ) : <p className="text-red-500">Chưa có tài liệu xác minh</p>}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleApprove(selectedEvent._id)}
                    className="flex-1 bg-green-600 text-white py-4 rounded-lg font-medium hover:bg-green-700"
                  >
                    ✅ Phê Duyệt
                  </button>

                  <button
                    onClick={() => handleReject(selectedEvent._id)}
                    className="flex-1 bg-red-600 text-white py-4 rounded-lg font-medium hover:bg-red-700"
                  >
                    ❌ Từ Chối
                  </button>
                </div>

                {rejectionReason !== undefined && (
                  <textarea
                    placeholder="Nhập lý do từ chối..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full mt-4 p-3 border rounded-lg"
                    rows={4}
                  />
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-20">Chọn một sự kiện để xem chi tiết và phê duyệt</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}