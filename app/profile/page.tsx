import { Shield } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
          <Shield className="w-8 h-8 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile features coming soon</h1>
        <p className="text-gray-500 max-w-xs mx-auto">
          Personal profiles, eco-points, and badges will be available in a future update.
        </p>
      </div>
    </div>
  );
}
