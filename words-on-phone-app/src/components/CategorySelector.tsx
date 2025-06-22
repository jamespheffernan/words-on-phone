import React, { useState, useMemo } from 'react';
import { CategoryMetadata } from '../types/category';
import './CategorySelector.css';

interface Props {
  defaultCategories: CategoryMetadata[];
  customCategories: CategoryMetadata[];
  selected: string[];
  onChange: (selected: string[]) => void;
  loading?: boolean;
}

export const CategorySelector: React.FC<Props> = ({
  defaultCategories,
  customCategories,
  selected,
  onChange,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default');
  const [search, setSearch] = useState('');

  const list = activeTab === 'default' ? defaultCategories : customCategories;

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const lc = search.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(lc));
  }, [search, list]);

  const toggleCategory = (name: string) => {
    const exists = selected.includes(name);
    const next = exists ? selected.filter((n) => n !== name) : [...selected, name];
    onChange(next);
  };

  return (
    <div className="category-selector">
      <div className="tabs">
        <button
          className={activeTab === 'default' ? 'active' : ''}
          onClick={() => setActiveTab('default')}
        >
          Default
        </button>
        <button
          className={activeTab === 'custom' ? 'active' : ''}
          onClick={() => setActiveTab('custom')}
        >
          Custom
        </button>
      </div>

      <input
        type="text"
        placeholder="Search categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {loading ? (
        <p>Loading categories...</p>
      ) : (
        <div className="category-grid">
          {filtered.map(({ name, phraseCount }) => (
            <label key={name} className={`category-tile ${selected.includes(name) ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={() => toggleCategory(name)}
              />
              <span className="name">{name}</span>
              <span className="count">({phraseCount})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}; 