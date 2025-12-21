import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Pill, Stethoscope, FlaskConical } from 'lucide-react';

interface Notification {
  id: string;
  type: 'lab_report' | 'doctor_visit';
  message: string;
  source: string;
  date: Date;
  read: boolean;
  relatedId?: string;
}

export default function Notifications() {
  const navigate = useNavigate();

  const notifications: Notification[] = [
    {
      id: '1',
      type: 'lab_report',
      message: 'New lab report: Blood Test has been uploaded',
      source: 'MedLab Diagnostics',
      date: new Date('2024-12-16T09:30:00'),
      read: false,
      relatedId: 'report-123'
    },
    {
      id: '2',
      type: 'doctor_visit',
      message: 'New Doctor Visit Added',
      source: 'Dr. Sarah Johnson',
      date: new Date('2024-12-15T14:20:00'),
      read: false,
      relatedId: 'visit-456'
    },
    {
      id: '3',
      type: 'doctor_visit',
      message: 'New Doctor Visit Added',
      source: 'Dr. Michael Chen',
      date: new Date('2024-12-14T11:15:00'),
      read: true,
      relatedId: 'visit-789'
    },
    {
      id: '4',
      type: 'lab_report',
      message: 'New lab report: ECG Report has been uploaded',
      source: 'Cardiac Care Center',
      date: new Date('2024-12-13T16:45:00'),
      read: true,
      relatedId: 'report-321'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'lab_report':
        return <FlaskConical className="w-5 h-5 text-blue-600" />;
      case 'doctor_visit':
        return <Stethoscope className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'lab_report':
        return 'bg-blue-50';
      case 'doctor_visit':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return 'Just now';
    } else if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to related record
    if (notification.type === 'lab_report') {
      navigate('/my-records');
    } else if (notification.type === 'doctor_visit') {
      navigate('/doctor-visits');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/patient-dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Notifications</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left ${
                !notification.read ? 'border-l-4 border-indigo-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${getIconBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-gray-800 mb-1 ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">{notification.source}</p>
                  <p className="text-xs text-gray-400">{formatDate(notification.date)}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}