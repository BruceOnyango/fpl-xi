import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { FormDot } from '@/components/atoms';
import { AvailabilityFlag, BanRiskFlag, PlayerName, PredictionRange } from '@/components/molecules';
import type { Player } from '@/lib/api/schemas';
import { formatPercent, formatPrice } from '@/lib/format';
import { valueScore } from '@/lib/fpl/players';
import { cn } from '@/lib/utils/cn';

export interface PlayerTableProps {
  players: readonly Player[];
  teamShort: (teamId: number) => string;
  /** Ids currently in the comparison set. */
  compareIds?: ReadonlySet<number>;
  onToggleCompare?: (playerId: number) => void;
  /** Max comparable players; checkboxes disable past this. */
  compareLimit?: number;
  initialSorting?: SortingState;
  /** Visible height of the scroll area (virtualised). */
  height?: number;
  caption: string;
  className?: string;
}

const col = createColumnHelper<Player>();
const ROW_HEIGHT = 56;

/**
 * Dense, sortable, virtualised player grid (~700 rows, §13). Filtering happens
 * upstream (URL-driven, in the page); this owns sorting and rendering only.
 */
export function PlayerTable({
  players,
  teamShort,
  compareIds,
  onToggleCompare,
  compareLimit = 3,
  initialSorting = [{ id: 'predicted', desc: true }],
  height = 560,
  caption,
  className,
}: PlayerTableProps) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const maxPred = useMemo(() => Math.max(1, ...players.map((p) => p.prediction.high)), [players]);

  const columns = useMemo(
    () => [
      ...(onToggleCompare
        ? [
            col.display({
              id: 'compare',
              header: () => <span className="sr-only">Compare</span>,
              cell: ({ row }) => {
                const p = row.original;
                const checked = compareIds?.has(p.id) ?? false;
                const full = (compareIds?.size ?? 0) >= compareLimit;
                return (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => onToggleCompare(p.id)}
                    aria-label={`Compare ${p.webName}`}
                  />
                );
              },
              size: 40,
            }),
          ]
        : []),
      col.accessor('webName', {
        id: 'player',
        header: 'Player',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="flex items-center gap-2">
              <PlayerName
                name={p.webName}
                fullName={`${p.firstName} ${p.secondName}`}
                teamShort={teamShort(p.teamId)}
                position={p.position}
              />
              <AvailabilityFlag
                variant="icon"
                status={p.status}
                chanceOfPlaying={p.chanceOfPlaying}
                news={p.news}
              />
              <BanRiskFlag
                variant="compact"
                yellowCards={p.yellowCards}
                oneYellowFromBan={p.oneYellowFromBan}
              />
            </span>
          );
        },
        size: 220,
      }),
      col.accessor('price', { header: 'Price', cell: (c) => formatPrice(c.getValue()), size: 70 }),
      col.accessor('form', {
        header: 'Form',
        cell: (c) => <FormDot form={c.getValue()} />,
        size: 80,
      }),
      col.accessor((p) => p.prediction.points, {
        id: 'predicted',
        header: 'Predicted',
        cell: ({ row }) => <PredictionRange prediction={row.original.prediction} max={maxPred} />,
        size: 220,
      }),
      col.accessor((p) => valueScore(p), {
        id: 'value',
        header: () => <abbr title="Predicted points per £m">Pts/£m</abbr>,
        cell: (c) => c.getValue().toFixed(2),
        size: 70,
      }),
      col.accessor('xg', {
        header: () => <abbr title="Expected goals (season)">xG</abbr>,
        cell: (c) => c.getValue().toFixed(1),
        size: 60,
      }),
      col.accessor('xa', {
        header: () => <abbr title="Expected assists (season)">xA</abbr>,
        cell: (c) => c.getValue().toFixed(1),
        size: 60,
      }),
      col.accessor('totalPoints', { header: 'Pts', cell: (c) => c.getValue(), size: 60 }),
      col.accessor('selectedByPercent', {
        header: 'Owned',
        cell: (c) => formatPercent(c.getValue()),
        size: 70,
      }),
    ],
    [compareIds, compareLimit, onToggleCompare, teamShort, maxPred],
  );

  const table = useReactTable({
    data: players as Player[],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (p) => String(p.id),
    sortDescFirst: true,
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    // jsdom has no layout; render a first screenful so tests see rows.
    initialRect: { width: 1000, height },
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
  const colCount = table.getVisibleLeafColumns().length;

  return (
    <div
      ref={scrollRef}
      // Scrollable regions must be keyboard-focusable (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={caption}
      className={cn('border-border relative overflow-auto rounded-lg border', className)}
      style={{ maxHeight: height }}
    >
      <table
        className="w-full min-w-[920px] border-collapse text-sm"
        aria-rowcount={rows.length + 1}
      >
        <caption className="sr-only">
          {caption}. {rows.length} players. Column headers are sort buttons.
        </caption>
        <thead className="bg-surface-2 text-muted sticky top-0 z-[2] text-xs">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const sorted = h.column.getIsSorted();
                const canSort = h.column.getCanSort();
                const Icon =
                  sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={h.id}
                    scope="col"
                    style={{ width: h.getSize() }}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          'hover:text-text inline-flex items-center gap-1 rounded',
                          sorted && 'text-text',
                        )}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <Icon aria-hidden className="h-3 w-3" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="tabular">
          {padTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={colCount} style={{ height: padTop, padding: 0 }} />
            </tr>
          ) : null}
          {items.map((vi) => {
            const row = rows[vi.index];
            if (!row) return null;
            return (
              <tr
                key={row.id}
                aria-rowindex={vi.index + 2}
                style={{ height: ROW_HEIGHT }}
                className={cn(
                  'border-border hover:bg-surface-2 border-t',
                  compareIds?.has(row.original.id) && 'bg-secondary-soft',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {padBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={colCount} style={{ height: padBottom, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
