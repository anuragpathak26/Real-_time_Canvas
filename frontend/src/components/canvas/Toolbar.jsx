import React, { useState } from 'react';
import { 
  FiMousePointer, 
  FiEdit3, 
  FiSquare, 
  FiCircle, 
  FiMinus, 
  FiType, 
  FiTrash2, 
  FiRotateCcw, 
  FiRotateCw, 
  FiZoomIn, 
  FiZoomOut, 
  FiDownload, 
  FiUpload,
  FiSave,
  FiRefreshCw
} from 'react-icons/fi';
import { BsEraserFill } from 'react-icons/bs';

const Toolbar = ({ 
  activeTool, 
  onToolChange, 
  color, 
  onColorChange, 
  brushSize, 
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onZoomIn,
  onZoomOut,
  onExport,
  onSave,
  canUndo,
  canRedo
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSize, setShowBrushSize] = useState(false);

  const tools = [
    { id: 'pointer', icon: FiMousePointer, label: 'Select', shortcut: 'V' },
    { id: 'pen', icon: FiEdit3, label: 'Pen', shortcut: 'P' },
    { id: 'eraser', icon: BsEraserFill, label: 'Eraser', shortcut: 'E' },
    { id: 'line', icon: FiMinus, label: 'Line', shortcut: 'L' },
    { id: 'rectangle', icon: FiSquare, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: FiCircle, label: 'Circle', shortcut: 'C' },
    { id: 'text', icon: FiType, label: 'Text', shortcut: 'T' },
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
    '#A52A2A', '#808080', '#000080', '#008000', '#800000',
    '#FFFFFF'
  ];

  const brushSizes = [1, 2, 4, 6, 8, 12, 16, 20, 24, 32];

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 flex flex-col gap-4 w-20 min-h-screen">
      {/* Tools */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">TOOLS</h3>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                p-3 rounded-lg transition-all duration-200 group relative
                ${activeTool === tool.id 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }
              `}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {tool.label} ({tool.shortcut})
              </div>
            </button>
          );
        })}
      </div>

      {/* Color Picker */}
      <div className="relative">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">COLOR</h3>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm relative overflow-hidden"
          style={{ backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-checkered opacity-20"></div>
        </button>
        
        {showColorPicker && (
          <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-xl border p-3 z-50">
            <div className="grid grid-cols-4 gap-2 w-32">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onColorChange(c);
                    setShowColorPicker(false);
                  }}
                  className={`
                    w-6 h-6 rounded border-2 transition-all
                    ${color === c ? 'border-gray-900 scale-110' : 'border-gray-300 hover:border-gray-500'}
                  `}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full mt-2 h-8 rounded border"
            />
          </div>
        )}
      </div>

      {/* Brush Size */}
      <div className="relative">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">SIZE</h3>
        <button
          onClick={() => setShowBrushSize(!showBrushSize)}
          className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <div 
            className="bg-gray-800 rounded-full"
            style={{ 
              width: Math.min(brushSize * 2, 24), 
              height: Math.min(brushSize * 2, 24) 
            }}
          />
        </button>
        
        {showBrushSize && (
          <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-xl border p-3 z-50">
            <div className="flex flex-col gap-2 w-32">
              {brushSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    onBrushSizeChange(size);
                    setShowBrushSize(false);
                  }}
                  className={`
                    flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition-colors
                    ${brushSize === size ? 'bg-green-100' : ''}
                  `}
                >
                  <div 
                    className="bg-gray-800 rounded-full"
                    style={{ width: size * 2, height: size * 2 }}
                  />
                  <span className="text-sm">{size}px</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-4">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">ACTIONS</h3>
        
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <FiRotateCcw className="w-5 h-5" />
        </button>
        
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <FiRotateCw className="w-5 h-5" />
        </button>
        
        <button
          onClick={onClear}
          className="p-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
          title="Clear Canvas"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom */}
      <div className="flex flex-col gap-2 mt-4">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">ZOOM</h3>
        
        <button
          onClick={onZoomIn}
          className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          title="Zoom In"
        >
          <FiZoomIn className="w-5 h-5" />
        </button>
        
        <button
          onClick={onZoomOut}
          className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          title="Zoom Out"
        >
          <FiZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Export/Save */}
      <div className="flex flex-col gap-2 mt-4">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">FILE</h3>
        
        <button
          onClick={onSave}
          className="p-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
          title="Save Canvas"
        >
          <FiSave className="w-5 h-5" />
        </button>
        
        <button
          onClick={onExport}
          className="p-3 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
          title="Export as Image"
        >
          <FiDownload className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
