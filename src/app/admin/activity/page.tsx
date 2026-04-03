import { ActivityIcon, Clock } from "lucide-react";

export default function AdminActivityPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Platform Activity</h1>
            <p className="text-gray-400">View real-time event logs and audit trails.</p>

            <div className="bg-[#141420] border border-white/5 rounded-2xl p-16 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <Clock className="text-emerald-400" size={40} />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Activity Feed Coming Soon</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    We are currently building the global event logging system. Soon you'll be able to see all incoming webhook orders, vendor status changes, and platform errors in real-time.
                </p>
            </div>
        </div>
    );
}
