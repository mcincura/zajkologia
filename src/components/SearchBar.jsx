import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
    return (
        <div style={{
            position: 'relative',
            maxWidth: '400px',
            width: '100%'
        }}>
            <input
                type="text"
                placeholder="Hľadaj články o králikoch..."
                onChange={(e) => onSearch && onSearch(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '50px',
                    border: '2px solid transparent',
                    backgroundColor: 'white',
                    fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.border = '2px solid var(--color-light)'}
                onBlur={(e) => e.target.style.border = '2px solid transparent'}
            />
            <Search
                size={20}
                style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999'
                }}
            />
        </div>
    );
};

export default SearchBar;
