'use client';

import { Button } from './ui/button';
import { Trash2, Copy, Clipboard } from 'lucide-react';
import { useDiagram } from '@/contexts/diagram-context';

interface ContextMenuProps {
  id?: string;
  type: 'node' | 'edge' | 'pane';
  top: number;
  left: number;
  onDelete: (type: 'node' | 'edge', id: string) => void;
  canDelete: boolean;
}

export default function ContextMenu({ id, type, top, left, onDelete, canDelete }: ContextMenuProps) {
  const { copySelectedElements, pasteElements, clipboard, setContextMenu } = useDiagram();

  const handleDelete = () => {
    if (id && (type === 'node' || type === 'edge')) {
      onDelete(type, id);
    }
  };

  const handleCopy = () => {
    copySelectedElements();
    setContextMenu(null);
  };

  const handlePaste = () => {
    pasteElements();
    setContextMenu(null);
  };

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md flex flex-col gap-0.5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {type !== 'pane' ? (
        <>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-1.5 text-sm h-8 rounded-sm"
            onClick={handleCopy}
          >
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy selected</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-1.5 text-sm h-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-sm"
            onClick={handleDelete}
            disabled={!canDelete}
            aria-label={canDelete ? `Delete ${type}` : `Delete ${type} (permission denied)`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start px-2 py-1.5 text-sm h-8 rounded-sm"
          onClick={handlePaste}
          disabled={!clipboard || clipboard.nodes.length === 0}
        >
          <Clipboard className="mr-2 h-4 w-4" />
          <span>Paste elements</span>
        </Button>
      )}
    </div>
  );
}
