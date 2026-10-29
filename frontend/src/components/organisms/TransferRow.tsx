import { ArrowRight, Trash2 } from 'lucide-react';
import { Button, Delta, PositionPill } from '@/components/atoms';
import type { Player } from '@/lib/api/schemas';
import { formatPrice } from '@/lib/format';

export interface TransferRowProps {
  out: Player;
  in: Player;
  /** £m the manager gets for `out`. */
  sellingPrice: number;
  teamShort: (teamId: number) => string;
  horizonLabel: string;
  onRemove: () => void;
}

function Side({
  label,
  tone,
  player,
  price,
  teamShort,
}: {
  label: string;
  tone: 'text-negative' | 'text-positive';
  player: Player;
  price: number;
  teamShort: string;
}) {
  return (
    <div className="min-w-0">
      <p className={`text-2xs font-semibold tracking-wide uppercase ${tone}`}>{label}</p>
      <p className="truncate text-sm font-semibold" title={player.webName}>
        {player.webName}
      </p>
      <p className="text-muted flex items-center gap-1.5 text-xs">
        <PositionPill position={player.position} />
        <span>{teamShort}</span>
        <span aria-hidden>·</span>
        <span className="tabular">{formatPrice(price)}</span>
      </p>
    </div>
  );
}

/** Money impact of a swap in words: "Costs £1.2m", "Frees £0.4m", "Same price". */
export function budgetImpact(cost: number): string {
  if (Math.abs(cost) < 0.05) return 'Same price';
  return cost > 0 ? `Costs ${formatPrice(cost)}` : `Frees ${formatPrice(-cost)}`;
}

/**
 * One planned move. Two lines so it fits the narrow plan panel:
 * Out → In on top; points swing, money and undo underneath.
 */
export function TransferRow({
  out,
  in: incoming,
  sellingPrice,
  teamShort,
  horizonLabel,
  onRemove,
}: TransferRowProps) {
  const delta = incoming.prediction.points - out.prediction.points;
  const cost = incoming.price - sellingPrice;
  return (
    <li className="border-border bg-surface-2 rounded-lg border">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 pt-2.5 pb-2">
        <Side
          label="Out"
          tone="text-negative"
          player={out}
          price={sellingPrice}
          teamShort={teamShort(out.teamId)}
        />
        <ArrowRight aria-hidden className="text-muted h-4 w-4" />
        <Side
          label="In"
          tone="text-positive"
          player={incoming}
          price={incoming.price}
          teamShort={teamShort(incoming.teamId)}
        />
      </div>
      <div className="border-border flex items-center justify-between gap-2 border-t py-1 pr-1 pl-3 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <Delta value={delta} unit="pts" />
          <span className="text-muted truncate">{horizonLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted whitespace-nowrap">{budgetImpact(cost)}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Undo transfer ${out.webName} to ${incoming.webName}`}
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </Button>
        </span>
      </div>
    </li>
  );
}
