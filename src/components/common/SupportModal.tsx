import React from 'react';
import { X, Phone, Mail, MessageSquare, Clock, MapPin, ExternalLink, Building2 } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Dooars Daily Basket"
              className="w-10 h-10 rounded-full object-contain bg-white p-0.5 shadow-xs shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-lg leading-tight">Partner Support Helpdesk</h3>
              <p className="text-xs text-emerald-100">Dooars Daily Basket Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600">
            Need urgent assistance with order dispatch, merchant verification, delivery partner coordination, or payout settlements?
          </div>

          <div className="space-y-3">
            <a
              href="tel:+919609882564"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 font-medium">Merchant Support Hotline</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">+91 96098 82564</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </a>

            <a
              href="https://wa.me/919609882564?text=Hello%20Dooars%20Daily%20Basket%20Support,%20I%20am%20a%20registered%20Market%20Partner."
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-100/50 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-emerald-700 font-medium">Official WhatsApp Dispatch Desk</div>
                <div className="text-sm font-bold text-emerald-900 group-hover:text-emerald-800">Chat with Regional Executive</div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-600" />
            </a>

            <a
              href="mailto:dooarsdailybasket@gmail.com"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 font-medium">Official Email Support</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">dooarsdailybasket@gmail.com</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </a>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Support Operating Hours: 7:00 AM – 10:30 PM (Daily)</span>
            </div>
            
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Regional Hub Districts: </span>
                <span className="text-slate-600">Jalpaiguri, Darjeeling, Kalimpong, Alipurduar, Cooch Behar (West Bengal)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-start gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-800">Dooars Daily Basket</div>
                <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Business Address: Leesh River T.G., Patibari Division<br />
                  Post - Bagrakote, Dist - Jalpaiguri, PIN - 734501<br />
                  State - West Bengal
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
