import React from 'react';
import useStore from '../store/useStore';
import { Palette, CheckCircle2 } from 'lucide-react';

const themes = [
  { id: 'theme-default', name: 'Default Amber', primary: '#f59e0b', secondary: '#0ea5e9' },
  { id: 'theme-ocean', name: 'Ocean Depth', primary: '#0284c7', secondary: '#0d9488' },
  { id: 'theme-sunset', name: 'Sunset Glow', primary: '#ea580c', secondary: '#e11d48' },
  { id: 'theme-forest', name: 'Mystic Forest', primary: '#16a34a', secondary: '#059669' },
  { id: 'theme-berry', name: 'Wild Berry', primary: '#9333ea', secondary: '#db2777' },
  { id: 'theme-midnight', name: 'Midnight Violet', primary: '#4f46e5', secondary: '#7c3aed' },
  { id: 'theme-aurora', name: 'Northern Lights', primary: '#0d9488', secondary: '#8b5cf6' },
  { id: 'theme-rose', name: 'Crimson Rose', primary: '#e11d48', secondary: '#dc2626' },
  { id: 'theme-lavender', name: 'Soft Lavender', primary: '#7c3aed', secondary: '#c026d3' },
  { id: 'theme-cyberpunk', name: 'Cyberpunk Neon', primary: '#ec4899', secondary: '#06b6d4' },
];

const Settings = () => {
  const activeThemeClass = useStore((state) => state.activeThemeClass);
  const setThemeClass = useStore((state) => state.setThemeClass);
  const isLightMode = useStore((state) => state.theme) === 'light';
  const toggleTheme = useStore((state) => state.toggleTheme);

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>App Settings</h1>
          <p className="text-muted">Configure your shop preferences and appearance.</p>
        </div>
      </div>
      
      <div className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Palette size={24} color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem' }}>Theme & Appearance</h2>
        </div>

        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Light / Dark Mode</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Toggle between bright and dark interface.</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={toggleTheme}
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              boxShadow: 'var(--shadow-md)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          </button>
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Premium Gradient Themes</h3>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Select a vibrant gradient theme to personalize your workspace. The changes apply instantly.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {themes.map((theme) => {
            const isActive = activeThemeClass === theme.id;
            return (
              <div 
                key={theme.id}
                onClick={() => setThemeClass(theme.id)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'var(--transition)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--primary)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}
                
                <div style={{
                  height: '60px',
                  borderRadius: 'var(--radius-sm)',
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                  boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                  transition: 'var(--transition)'
                }}></div>
                
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{theme.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.primary, display: 'inline-block' }}></span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.secondary, display: 'inline-block' }}></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Settings;
