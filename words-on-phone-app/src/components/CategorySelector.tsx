import React, { useState, useMemo } from 'react';
import { CategoryMetadata } from '../types/category';
import { useGameStore } from '../store';
import './CategorySelector.css';

type SortKey = 'name' | 'count';

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

  const { pinnedCategories, togglePinnedCategory } = useGameStore();
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const rawList = activeTab === 'default' ? defaultCategories : customCategories;
  const list = useMemo(()=> {
    const pinned = rawList.filter(c=> pinnedCategories.includes(c.name));
    const others = rawList.filter(c=> !pinnedCategories.includes(c.name));
    const sortFn = sortKey === 'name'
      ? (a: CategoryMetadata, b: CategoryMetadata) => a.name.localeCompare(b.name)
      : (a: CategoryMetadata, b: CategoryMetadata) => b.phraseCount - a.phraseCount;
    return [
      ...pinned.sort(sortFn),
      ...others.sort(sortFn)
    ];
  }, [rawList, pinnedCategories, sortKey]);

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

  // Bulk operations
  const selectAll = () => onChange(list.map(l=> l.name));
  const clearAll = () => onChange([]);
  const invertSelection = () => {
    const next = list.map(l=> l.name).filter(name=> !selected.includes(name));
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

      <div className="toolbar">
        <select value={sortKey} onChange={(e)=> setSortKey(e.target.value as SortKey)} aria-label="Sort categories">
          <option value="name">Sort: A→Z</option>
          <option value="count">Sort: Phrase Count</option>
        </select>

        <button onClick={selectAll} type="button">Select All</button>
        <button onClick={clearAll} type="button">Clear</button>
        <button onClick={invertSelection} type="button">Invert</button>
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
              <button
                type="button"
                className={`pin-btn ${pinnedCategories.includes(name)?'pinned':''}`}
                onClick={(e)=> {e.stopPropagation(); togglePinnedCategory(name);} }
                aria-label={pinnedCategories.includes(name)?'Unpin':'Pin'}
              >★</button>
              <span className="name">{name}</span>
              <span className="count">({phraseCount})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}; 