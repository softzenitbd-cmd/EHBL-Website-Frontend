import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import useStore from '../store/useStore';

const GlobalToast = () => {
  const { toast, hideToast } = useStore();

  if (!toast.show) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getColor = () => {
    switch (toast.type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getGradient = () => {
    switch (toast.type) {
      case 'success': return 'linear-gradient(90deg, #38bdf8 0%, #a7f3d0 100%)';
      case 'warning': return '#fcd34d';
      case 'error': return '#fca5a5';
      default: return '#93c5fd';
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '12px 16px',
        minWidth: '300px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ color: getColor(), marginRight: '12px', display: 'flex', alignItems: 'center' }}>
          {getIcon()}
        </div>
        <div style={{ flex: 1, color: '#334155', fontWeight: '500', fontSize: '0.95rem' }}>
          {toast.message}
        </div>
        <button 
          onClick={hideToast} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', display: 'flex' }}
        >
          <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
        </button>
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          height: '4px', 
          width: '100%', 
          background: getGradient(),
          animation: 'shrink 3s linear forwards'
        }} />
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </div>,
    document.body
  );
};

export default GlobalToast;
