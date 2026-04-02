import React from 'react';

const MenuDropdown = ({ items, onClose }) => (
  <div className="menu-dropdown" role="menu">
    {items.map((item, index) => {
      if (item.type === 'separator') {
        return <div key={`separator-${index}`} className="menu-separator" />;
      }

      return (
        <button
          key={`${item.label}-${index}`}
          className={`menu-item ${item.active ? 'menu-item-active' : ''}`}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onSelect?.();
            onClose?.();
          }}
        >
          <span>{item.label}</span>
          {item.shortcut ? <span className="menu-shortcut">{item.shortcut}</span> : null}
        </button>
      );
    })}
  </div>
);

export default MenuDropdown;
