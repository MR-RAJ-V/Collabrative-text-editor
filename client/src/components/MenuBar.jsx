import React, { useEffect, useRef, useState } from 'react';
import MenuDropdown from './MenuDropdown';

const MenuBar = ({ menus }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!openMenu) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [openMenu]);

  return (
    <nav className="workspace-menu-row" ref={containerRef} aria-label="Document menu">
      {menus.map((menu) => {
        const isOpen = openMenu === menu.label;

        return (
          <div className="menu-group" key={menu.label}>
            <button
              className={`workspace-menu-button ${isOpen ? 'workspace-menu-button-active' : ''}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => setOpenMenu((current) => (current === menu.label ? null : menu.label))}
            >
              {menu.label}
            </button>

            {isOpen ? <MenuDropdown items={menu.items} onClose={() => setOpenMenu(null)} /> : null}
          </div>
        );
      })}
    </nav>
  );
};

export default MenuBar;
