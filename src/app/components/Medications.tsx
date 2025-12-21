import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, CheckCircle, Clock } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  timing: string[];
  taken: { [key: string]: boolean };
}

export default function Medications() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: '1',
      name: 'Cetirizine',
      dosage: '10mg',
      timing: ['Morning'],
      taken: { morning: false }
    },
    {
      id: '2',
      name: 'Paracetamol',
      dosage: '500mg',
      timing: ['Morning', 'Afternoon', 'Night'],
      taken: { morning: true, afternoon: false, night: false }
    },
    {
      id: '3',
      name: 'Vitamin D',
      dosage: '2000 IU',
      timing: ['Morning'],
      taken: { morning: true }
    }
  ]);

  const toggleMedication = (medId: string, time: string) => {
    setMedications(meds =>
      meds.map(med =>
        med.id === medId
          ? { ...med, taken: { ...med.taken, [time.toLowerCase()]: !med.taken[time.toLowerCase()] } }
          : med
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/patient-dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Medications</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-4">
        {/* Today's Schedule */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-5 text-white shadow-lg">
          <h2 className="text-lg mb-2">Today's Schedule</h2>
          <p className="text-sm text-orange-50">
            {medications.reduce((acc, med) => acc + med.timing.length, 0)} doses for today
          </p>
        </div>

        {/* Medications List */}
        <div className="space-y-3">
          {medications.map(med => (
            <div key={med.id} className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-800">{med.name}</h3>
                  <p className="text-sm text-gray-500">{med.dosage}</p>
                </div>
              </div>

              {/* Timing */}
              <div className="space-y-2">
                {med.timing.map(time => {
                  const timeKey = time.toLowerCase();
                  const isTaken = med.taken[timeKey];
                  
                  return (
                    <button
                      key={time}
                      onClick={() => toggleMedication(med.id, time)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${
                        isTaken
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTaken ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-sm ${isTaken ? 'text-green-700' : 'text-gray-700'}`}>
                          {time}
                        </span>
                      </div>
                      <span className={`text-xs ${isTaken ? 'text-green-600' : 'text-gray-500'}`}>
                        {isTaken ? 'Taken' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {medications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No medications scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}
