'use client';

import { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import type { AppNode, AppEdge } from '@/lib/types';
import 'reactflow/dist/style.css';

import { useDiagram } from '@/contexts/diagram-context';
import SourcePanelNode from './custom-nodes/source-panel-node';
import DistributionPanelNode from './custom-nodes/distribution-panel-node';
import ContextMenu from './context-menu';

import './../app/react-flow.css';
import { useRole } from '@/contexts/role-context';

const nodeTypes = {
  sourcePanel: SourcePanelNode,
  distributionPanel: DistributionPanelNode,
};

const proOptions = { hideAttribution: true };

export default function DiagramCanvas() {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    reactFlowInstance,
    setReactFlowInstance,
    selectNode,
    statusFilter,
    collapsedNodes,
    contextMenu,
    setContextMenu,
    setLastClickPosition,
    copySelectedElements,
    pasteElements,
    onNodeDragStart,
    onNodeDragStop,
    undo,
  } = useDiagram();
  const { hasPermission } = useRole();

  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!nodes.length) {
      return { visibleNodes: [], visibleEdges: [] };
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const childrenMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)!.push(edge.target);
    });

    // Get all nodes that are recursively downstream from a collapsed node
    const hiddenNodeIds = new Set<string>();
    const getDownstreamRecursive = (nodeId: string) => {
      const children = childrenMap.get(nodeId) || [];
      for (const childId of children) {
        if (!hiddenNodeIds.has(childId)) {
          hiddenNodeIds.add(childId);
          getDownstreamRecursive(childId);
        }
      }
    };
    for (const nodeId in collapsedNodes) {
      if (collapsedNodes[nodeId]) {
        getDownstreamRecursive(nodeId);
      }
    }
    
    // Filter nodes based on status and visibility (not downstream of a collapsed node)
    const visibleNodes = nodes.filter(node => 
      !hiddenNodeIds.has(node.id) &&
      (node.data.isSource || statusFilter[node.data.status!])
    );
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Filter edges to only include those connecting visible nodes
    const visibleEdges = edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    return { visibleNodes, visibleEdges };
  }, [nodes, edges, statusFilter, collapsedNodes]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      event.preventDefault();
      const pane = (event.target as HTMLElement).closest('.react-flow__pane');
      if (!pane) return;
      const paneRect = pane.getBoundingClientRect();
      setContextMenu({
        id: node.id,
        type: 'node',
        top: event.clientY - paneRect.top,
        left: event.clientX - paneRect.left,
      });
    },
    [setContextMenu]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: AppEdge) => {
      event.preventDefault();
      const pane = (event.target as HTMLElement).closest('.react-flow__pane');
      if (!pane) return;
      const paneRect = pane.getBoundingClientRect();
      setContextMenu({
        id: edge.id,
        type: 'edge',
        top: event.clientY - paneRect.top,
        left: event.clientX - paneRect.left,
      });
    },
    [setContextMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const pane = (event.target as HTMLElement).closest('.react-flow__pane');
      if (!pane) return;
      const paneRect = pane.getBoundingClientRect();
      const clickX = event.clientX;
      const clickY = event.clientY;

      if (reactFlowInstance) {
        setLastClickPosition(reactFlowInstance.project({
          x: clickX - paneRect.left,
          y: clickY - paneRect.top,
        }));
      }

      setContextMenu({
        type: 'pane',
        top: clickY - paneRect.top,
        left: clickX - paneRect.left,
      });
    },
    [setContextMenu, reactFlowInstance, setLastClickPosition]
  );
  
  const onPaneClick = (event: React.MouseEvent) => {
    selectNode(null);
    setContextMenu(null);
    if (reactFlowInstance) {
        setLastClickPosition(reactFlowInstance.project({
            x: event.clientX,
            y: event.clientY,
        }));
    }
  };

  // Keyboard shortcuts for copy, paste & undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copySelectedElements();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteElements();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedElements, pasteElements, undo]);


  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        proOptions={proOptions}
        fitView
        className="bg-background"
        elementsSelectable={true}
        nodesDraggable={hasPermission('Supervisor')}
        deleteKeyCode={['Backspace', 'Delete']}
        snapToGrid={true}
        snapGrid={[16, 16]}
      >
        <Background gap={16} />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          id={contextMenu.id}
          type={contextMenu.type}
          top={contextMenu.top}
          left={contextMenu.left}
          onDelete={(type, id) => {
            if (type === 'node') {
              onNodesChange([{ type: 'remove', id }]);
            } else {
              onEdgesChange([{ type: 'remove', id }]);
            }
            setContextMenu(null);
          }}
          canDelete={hasPermission('Supervisor')}
        />
      )}
    </div>
  );
}
