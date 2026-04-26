import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type ItemWithId = { id: string };

type CrmKanbanVirtualListProps<T extends ItemWithId> = {
  items: T[];
  /** Espaço entre cartões (equivale ao antigo `gap` do flex). */
  gapPx?: number;
  renderItem: (item: T) => React.ReactNode;
};

/**
 * Lista com scroll dentro da coluna Kanban — só monta linhas próximas do viewport.
 * Mantém o mesmo aspeto visual (cartões iguais; scroll na coluna).
 */
export function CrmKanbanVirtualList<T extends ItemWithId>({
  items,
  gapPx = 12,
  renderItem,
}: CrmKanbanVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 6,
  });

  return (
    <div
      ref={parentRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingRight: 2,
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const lead = items[v.index];
          return (
            <div
              key={lead.id}
              data-index={v.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${v.start}px)`,
                paddingBottom: v.index < items.length - 1 ? gapPx : 0,
                boxSizing: 'border-box',
              }}
            >
              {renderItem(lead)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
