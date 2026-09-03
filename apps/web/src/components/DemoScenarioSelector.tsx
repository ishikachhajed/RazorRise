import React from 'react';
import { Play, Laptop, Headphones, Gamepad2, Tag } from 'lucide-react';

interface DemoScenarioSelectorProps {
  onSelectScenario: (prompt: string) => void;
}

export const DemoScenarioSelector: React.FC<DemoScenarioSelectorProps> = ({ onSelectScenario }) => {
  const scenarios = [
    {
      id: 1,
      title: 'Coding Laptop < ₹70k',
      prompt: 'I need a laptop for coding and programming under ₹70,000.',
      icon: Laptop,
    },
    {
      id: 2,
      title: 'ANC Headphones < ₹10k',
      prompt: 'I need headphones under ₹10,000 with noise cancellation for travel.',
      icon: Headphones,
    },
    {
      id: 3,
      title: 'Gaming Setup',
      prompt: 'I want a gaming setup with RTX GPU and high refresh rate monitor.',
      icon: Gamepad2,
    },
    {
      id: 4,
      title: 'Accessories < ₹5k',
      prompt: 'I want accessories like power bank or USB-C hub under ₹5,000.',
      icon: Tag,
    }
  ];

  return (
    <div className="card mb-4" style={{ backgroundColor: '#FAF5F6', padding: '12px' }}>
      <div className="flex items-center gap-2 mb-3">
        <Play size={14} style={{ color: 'var(--color-mauve)', fill: 'var(--color-mauve)' }} />
        <h4 className="m-0 text-xs font-bold text-muted uppercase tracking-wider">
          Try a Demo Scenario
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {scenarios.map((sc) => {
          const IconComp = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.prompt)}
              className="btn-tertiary flex items-start gap-2 text-left"
              style={{ padding: '8px 12px', backgroundColor: 'white' }}
            >
              <IconComp size={16} style={{ color: 'var(--color-mauve)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ minWidth: 0 }}>
                <span className="text-sm font-bold block truncate" style={{ color: 'var(--text-primary)' }}>
                  {sc.title}
                </span>
                <span className="text-xs text-muted truncate block">
                  "{sc.prompt}"
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
