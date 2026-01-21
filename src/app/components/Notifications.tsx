import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Pill, Stethoscope, FlaskConical, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'lab_report' | 'doctor_visit' | 'medication_reminder';
  message: string;
  source: string;
  date: Date;
  read: boolean;
  relatedId?: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('unique_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profile?.unique_id) return;

        // Fetch visits
        const { data: visits } = await supabase
          .from('doctor_visits')
          .select('*')
          .eq('patient_unique_id', profile.unique_id)
          .order('created_at', { ascending: false });

        const notifs: Notification[] = [];
        const seenKey = 'seen_notifications';
        const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const dismissedKey = 'dismissed_notifications';
        const dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

        // Add visit notifications
        if (visits) {
          visits.forEach(visit => {
            const notifId = `visit-${visit.id}`;
            if (dismissedIds.includes(notifId)) return;
            notifs.push({
              id: notifId,
              type: 'doctor_visit',
              message: 'New Doctor Visit Added',
              source: visit.doctor_name || 'Doctor',
              date: new Date(visit.created_at),
              read: seenIds.includes(`visit-${visit.id}`),
              relatedId: visit.id
            });
          });
        }

        // Fetch lab reports
        const { data: labReports } = await supabase
          .from('lab_reports')
          .select('id, file_name, category, uploaded_at')
          .eq('patient_unique_id', profile.unique_id)
          .order('uploaded_at', { ascending: false });

        if (labReports) {
          labReports.forEach(report => {
            const notifId = `lab-${report.id}`;
            if (dismissedIds.includes(notifId)) return;
            notifs.push({
              id: notifId,
              type: 'lab_report',
              message: 'New Lab Report Added',
              source: report.file_name || report.category || 'Laboratory',
              date: new Date(report.uploaded_at),
              read: seenIds.includes(notifId),
              relatedId: report.id
            });
          });
        }

        // Add medication reminders
        const now = new Date();
        const currentHour = now.getHours();
        const medicationTimes = {
          'Morning': 8,
          'Afternoon': 14,
          'Night': 21
        };

        if (visits) {
          visits.forEach(visit => {
            if (visit.prescription && Array.isArray(visit.prescription)) {
              visit.prescription.forEach((p: string, idx: number) => {
                const timeMatch = p.match(/\(([^)]+)\)/);
                const times = timeMatch ? timeMatch[1].split(', ').map((t: string) => t.trim()) : [];
                const name = p.split(' - ')[0] || 'Medicine';

                times.forEach((time: string) => {
                  const scheduledHour = medicationTimes[time as keyof typeof medicationTimes];
                  if (scheduledHour && currentHour === scheduledHour) {
                    const medNotifId = `med-${visit.id}-${idx}-${time}-${now.toISOString().split('T')[0]}`;
                    if (!seenIds.includes(medNotifId) && !dismissedIds.includes(medNotifId)) {
                      notifs.push({
                        id: medNotifId,
                        type: 'medication_reminder',
                        message: `Time to take ${name}`,
                        source: `${time} dose`,
                        date: now,
                        read: false,
                        relatedId: visit.id
                      });
                    }
                  }
                });
              });
            }
          });
        }

        setNotifications(notifs.sort((a, b) => b.date.getTime() - a.date.getTime()));
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
    // Refresh every minute to catch medication reminders
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'lab_report':
        return <FlaskConical className="w-5 h-5 text-blue-600" />;
      case 'doctor_visit':
        return <Stethoscope className="w-5 h-5 text-green-600" />;
      case 'medication_reminder':
        return <Pill className="w-5 h-5 text-orange-600" />;
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
      case 'medication_reminder':
        return 'bg-orange-50';
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

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Mark as dismissed in localStorage
    const dismissedKey = 'dismissed_notifications';
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
    dismissed.push(notificationId);
    localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as seen
    const seenKey = 'seen_notifications';
    const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
    if (!seenIds.includes(notification.id)) {
      seenIds.push(notification.id);
      localStorage.setItem(seenKey, JSON.stringify(seenIds));
    }

    // Navigate to related page
    if (notification.type === 'lab_report') {
      navigate('/my-records');
    } else if (notification.type === 'doctor_visit') {
      navigate('/doctor-visits');
    } else if (notification.type === 'medication_reminder') {
      navigate('/medications');
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
            <div
              key={notification.id}
              className={`relative w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${
                !notification.read ? 'border-l-4 border-indigo-500' : ''
              }`}
            >
              <button
                onClick={() => handleNotificationClick(notification)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${getIconBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
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
              <button
                onClick={(e) => handleDismiss(e, notification.id)}
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}