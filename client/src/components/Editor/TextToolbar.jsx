import React, { memo } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Eraser,
  IndentDecrease,
  IndentIncrease,
  List,
  ListOrdered,
  Minus,
  PaintBucket,
  Palette,
  Plus,
  Strikethrough,
  Type,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';

const alignmentOptions = [
  { value: 'left', icon: AlignLeft, label: 'Align left' },
  { value: 'center', icon: AlignCenter, label: 'Align center' },
  { value: 'right', icon: AlignRight, label: 'Align right' },
  { value: 'justify', icon: AlignJustify, label: 'Justify' },
];

const TextToolbar = ({ canEdit, state, actions, config }) => {
  if (!state || !actions || !config) {
    return null;
  }

  const toolButtonClass = (isActive = false) => `toolbar-button ${isActive ? 'active' : ''}`;

  return (
    <div className="text-toolbar" aria-label="Text formatting toolbar">
      <div className="toolbar-section toolbar-section-selects">
        <div className="toolbar-select-shell">
          <select
            className="toolbar-select"
            disabled={!canEdit}
            onChange={(event) => actions.setFontFamily(event.target.value)}
            value={state.fontFamily}
            title="Font family"
          >
            {config.fontFamilies.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="toolbar-select-icon" />
        </div>

        <div className="toolbar-font-size-group">
          <button
            disabled={!canEdit}
            onClick={actions.decreaseFontSize}
            className={toolButtonClass()}
            title="Decrease font size"
          >
            <Minus size={16} />
          </button>
          <div className="toolbar-select-shell toolbar-select-shell-compact">
            <select
              className="toolbar-select toolbar-select-compact"
              disabled={!canEdit}
              onChange={(event) => actions.setFontSize(event.target.value)}
              value={state.fontSize}
              title="Font size"
            >
              {config.fontSizes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="toolbar-select-icon" />
          </div>
          <button
            disabled={!canEdit}
            onClick={actions.increaseFontSize}
            className={toolButtonClass()}
            title="Increase font size"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="toolbar-select-shell">
          <select
            className="toolbar-select"
            disabled={!canEdit}
            onChange={(event) => actions.setBlockType(event.target.value)}
            value={state.blockType}
            title="Text style"
          >
            {config.textStyles.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="toolbar-select-icon" />
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button disabled={!canEdit} onClick={actions.toggleBold} className={toolButtonClass(state.isBold)} title="Bold">
          <Bold size={18} />
        </button>
        <button disabled={!canEdit} onClick={actions.toggleItalic} className={toolButtonClass(state.isItalic)} title="Italic">
          <Italic size={18} />
        </button>
        <button disabled={!canEdit} onClick={actions.toggleUnderline} className={toolButtonClass(state.isUnderline)} title="Underline">
          <Underline size={18} />
        </button>
        <button disabled={!canEdit} onClick={actions.toggleStrike} className={toolButtonClass(state.isStrike)} title="Strikethrough">
          <Strikethrough size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        {alignmentOptions.map(({ value, icon, label }) => {
          const AlignmentIcon = icon;

          return (
            <button
              key={value}
              disabled={!canEdit}
              onClick={() => actions.setTextAlign(value)}
              className={toolButtonClass(state.alignment === value)}
              title={label}
            >
              <AlignmentIcon size={18} />
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button disabled={!canEdit} onClick={actions.toggleBulletList} className={toolButtonClass(state.isBulletList)} title="Bullet list">
          <List size={18} />
        </button>
        <button disabled={!canEdit} onClick={actions.toggleOrderedList} className={toolButtonClass(state.isOrderedList)} title="Numbered list">
          <ListOrdered size={18} />
        </button>
        <button disabled={!canEdit || !state.canOutdent} onClick={actions.decreaseIndent} className={toolButtonClass()} title="Decrease indent">
          <IndentDecrease size={18} />
        </button>
        <button disabled={!canEdit || !state.canIndent} onClick={actions.increaseIndent} className={toolButtonClass()} title="Increase indent">
          <IndentIncrease size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <label className={`toolbar-color-button ${!canEdit ? 'toolbar-color-button-disabled' : ''}`} title="Text color">
          <Palette size={16} />
          <span className="toolbar-color-swatch" style={{ '--swatch-color': state.textColor }} />
          <input type="color" value={state.textColor} onChange={(event) => actions.setTextColor(event.target.value)} disabled={!canEdit} />
        </label>

        <label className={`toolbar-color-button ${!canEdit ? 'toolbar-color-button-disabled' : ''}`} title="Highlight color">
          <PaintBucket size={16} />
          <span className="toolbar-color-swatch" style={{ '--swatch-color': state.highlightColor }} />
          <input type="color" value={state.highlightColor} onChange={(event) => actions.setHighlightColor(event.target.value)} disabled={!canEdit} />
        </label>

        <button
          disabled={!canEdit || !state.canClearFormatting}
          onClick={actions.clearFormatting}
          className={toolButtonClass()}
          title="Clear formatting"
        >
          <Eraser size={18} />
        </button>
      </div>
    </div>
  );
};

export default memo(TextToolbar);
