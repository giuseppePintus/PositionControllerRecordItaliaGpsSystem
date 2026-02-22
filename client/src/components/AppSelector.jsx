import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Satellite, Building2 } from 'lucide-react';
import clsx from 'clsx';

const sections = [
  { id: 'satellite', path: '/', icon: Satellite, label: 'Satellitare' },
  { id: 'gestionale', path: '/gestionale', icon: Building2, label: 'Gestionale' },
];

export default function AppSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentSection = location.pathname.startsWith('/gestionale') ? 'gestionale' : 'satellite';

  const handleSectionChange = (section) => {
    navigate(section.path);
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="flex items-center justify-center gap-1 py-1.5 px-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(section)}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              currentSection === section.id
                ? "bg-primary-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <section.icon size={16} />
            <span>{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
