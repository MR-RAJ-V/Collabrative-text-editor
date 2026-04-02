import React from 'react';

const EditorLayout = ({ sidebar, children }) => (
  <main className="editor-layout">
    <div className="editor-workspace">
      {sidebar}
      <div className="editor-stage">
        {children}
      </div>
    </div>
  </main>
);

export default EditorLayout;
