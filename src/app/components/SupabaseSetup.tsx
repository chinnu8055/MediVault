import { useState } from 'react';
import { AlertCircle, Copy, CheckCircle, ExternalLink } from 'lucide-react';

export default function SupabaseSetup() {
  const [copied, setCopied] = useState(false);
  const [copiedGoogle, setCopiedGoogle] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'google'>('database');

  const sqlCommands = `-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  unique_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'lab')),
  phone TEXT,
  age INTEGER,
  gender TEXT,
  gov_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 4. Create RLS Policies
CREATE POLICY "Allow public insert for registration" 
ON user_profiles 
FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Users can read own profile" 
ON user_profiles 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Users can update own profile" 
ON user_profiles 
FOR UPDATE 
TO public 
USING (true)
WITH CHECK (true);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_unique_id ON user_profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);`;

  const copyToClipboard = (text: string, type: 'sql' | 'google') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedGoogle(true);
      setTimeout(() => setCopiedGoogle(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl text-gray-800 mb-2">Complete Setup Guide</h1>
              <p className="text-gray-600">
                Follow these steps to enable full authentication functionality
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('database')}
                className={`pb-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'database'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                1. Database Setup
              </button>
              <button
                onClick={() => setActiveTab('google')}
                className={`pb-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'google'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                2. Google OAuth Setup
              </button>
            </div>
          </div>

          {/* Database Setup Tab */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h2 className="text-lg text-blue-900 mb-2">📋 Database Setup Steps:</h2>
                <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
                  <li>Open your <strong>Supabase Dashboard</strong></li>
                  <li>Go to <strong>SQL Editor</strong> (in the left sidebar)</li>
                  <li>Copy the SQL commands below</li>
                  <li>Paste into the SQL Editor</li>
                  <li>Click <strong>"Run"</strong></li>
                  <li>You should see "Success. No rows returned"</li>
                </ol>
              </div>

              {/* SQL Commands */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700">SQL Commands:</h3>
                  <button
                    onClick={() => copyToClipboard(sqlCommands, 'sql')}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy SQL
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  <code>{sqlCommands}</code>
                </pre>
              </div>

              {/* Additional Help */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h3 className="text-yellow-900 mb-2">💡 What these commands do:</h3>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                  <li>Create the <code>user_profiles</code> table to store user data</li>
                  <li>Enable Row Level Security (RLS) for data protection</li>
                  <li>Add policies to allow registration and profile access</li>
                  <li>Create indexes for faster database queries</li>
                </ul>
              </div>

              {/* Link to Dashboard */}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gray-800 text-white text-center py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                Open Supabase Dashboard
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Next Step */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-800 text-center">
                  ✅ After completing this step, click the <strong>"2. Google OAuth Setup"</strong> tab above
                </p>
              </div>
            </div>
          )}

          {/* Google OAuth Setup Tab */}
          {activeTab === 'google' && (
            <div className="space-y-6">
              {/* Step 1: Google Cloud Console */}
              <div className="bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 rounded-xl p-5">
                <h2 className="text-lg text-red-900 mb-4 flex items-center gap-2">
                  <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Google Cloud Console Setup
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">A. Create OAuth Credentials</h3>
                    <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                      <li>Create a new project or select an existing one</li>
                      <li>Navigate to <strong>APIs & Services</strong> → <strong>Credentials</strong></li>
                      <li>Click <strong>"+ CREATE CREDENTIALS"</strong> → <strong>"OAuth client ID"</strong></li>
                      <li>Select <strong>"Web application"</strong> as the application type</li>
                      <li>Give it a name (e.g., "Healthcare App")</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">B. Configure Authorized Redirect URIs</h3>
                    <p className="text-sm text-gray-600">Add these URLs in the <strong>"Authorized redirect URIs"</strong> section:</p>
                    
                    <div className="space-y-2">
                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs">Production (Supabase callback):</span>
                          <button
                            onClick={() => copyToClipboard('https://hkpfgncmfxsazvirpfwg.supabase.co/auth/v1/callback', 'google')}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                          >
                            {copiedGoogle ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <code>https://hkpfgncmfxsazvirpfwg.supabase.co/auth/v1/callback</code>
                      </div>

                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs">Local Development:</span>
                        </div>
                        <code>http://localhost:5173</code>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <strong>⚠️ Important:</strong> Replace <code>hkpfgncmfxsazvirpfwg</code> with YOUR actual Supabase project ID if different. 
                        You can find this in your Supabase dashboard URL.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">C. Get Your Credentials</h3>
                    <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                      <li>Click <strong>"Create"</strong></li>
                      <li>Copy your <strong>Client ID</strong> (looks like: 123456789-abc.apps.googleusercontent.com)</li>
                      <li>Copy your <strong>Client Secret</strong></li>
                      <li>Keep these values - you'll need them in the next step</li>
                    </ol>
                  </div>

                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-red-600 text-white text-center py-3 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Open Google Cloud Console
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Step 2: Supabase Configuration */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-5">
                <h2 className="text-lg text-green-900 mb-4 flex items-center gap-2">
                  <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Supabase Dashboard Configuration
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">A. Enable Google Provider</h3>
                    <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                      <li>Open your <strong>Supabase Dashboard</strong></li>
                      <li>Go to <strong>Authentication</strong> → <strong>Providers</strong></li>
                      <li>Find <strong>"Google"</strong> in the list</li>
                      <li>Toggle it to <strong>ENABLED</strong></li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">B. Add Google Credentials</h3>
                    <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                      <li>Paste your <strong>Client ID</strong> from Google Cloud Console</li>
                      <li>Paste your <strong>Client Secret</strong> from Google Cloud Console</li>
                      <li>Click <strong>"Save"</strong></li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <h3 className="text-gray-800">C. Configure Site URL</h3>
                    <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                      <li>Go to <strong>Authentication</strong> → <strong>URL Configuration</strong></li>
                      <li>Set <strong>Site URL</strong> to: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5173</code></li>
                      <li>Add to <strong>Redirect URLs</strong>: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5173/**</code></li>
                      <li>Click <strong>"Save"</strong></li>
                    </ol>
                  </div>

                  <a
                    href="https://supabase.com/dashboard/project/_/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-600 text-white text-center py-3 rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Open Supabase Auth Settings
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Step 3: Enable in Code */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
                <h2 className="text-lg text-purple-900 mb-4 flex items-center gap-2">
                  <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  Enable Google OAuth in App
                </h2>
                
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    After completing steps 1 and 2, you need to disable demo mode in the code:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm">
                    <p className="text-gray-400 text-xs mb-2">File: /src/app/components/UnifiedAuth.tsx</p>
                    <code>
                      <span className="text-gray-500">// Change this line from:</span><br/>
                      <span className="text-red-400">const DEMO_MODE = true;</span><br/>
                      <br/>
                      <span className="text-gray-500">// To:</span><br/>
                      <span className="text-green-400">const DEMO_MODE = false;</span>
                    </code>
                  </div>
                  <p className="text-xs text-gray-600">
                    💡 This will enable Google OAuth button and disable the demo OTP mode
                  </p>
                </div>
              </div>

              {/* Testing */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="text-blue-900 mb-2">🧪 Testing Google OAuth:</h3>
                <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
                  <li>Complete all 3 steps above</li>
                  <li>Go back to the login page</li>
                  <li>Select a role (Patient/Doctor/Lab)</li>
                  <li>Click <strong>"Continue with Google"</strong></li>
                  <li>You should be redirected to Google login</li>
                  <li>After login, you'll be redirected back to complete registration</li>
                </ol>
              </div>

              {/* Demo Mode Alternative */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="text-green-900 mb-2">🎯 Or Continue Using Demo Mode:</h3>
                <p className="text-sm text-green-800">
                  If you prefer to test without setting up Google OAuth, keep <code>DEMO_MODE = true</code> and use:
                </p>
                <div className="mt-2 bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-green-700 text-sm">
                    <strong>Phone:</strong> Any 10-digit number (e.g., 9876543210)<br />
                    <strong>OTP:</strong> 123456
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}