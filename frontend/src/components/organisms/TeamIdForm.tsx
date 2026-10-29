import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@/components/atoms';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils/cn';

/** Example ID from the backend README, offered as a one-click demo. */
export const DEMO_TEAM_ID = 8350133;

const schema = z.object({
  teamId: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Team IDs are numbers only — find yours in the URL of your FPL "Points" page.')
    .refine(
      (v) => Number(v) > 0 && Number(v) < 100_000_000,
      'That doesn’t look like a valid team ID.',
    ),
});
type FormValues = z.infer<typeof schema>;

export interface TeamIdFormProps {
  /** Called after the ID is saved. */
  onSaved?: (teamId: number) => void;
  showDemo?: boolean;
  submitLabel?: string;
  className?: string;
}

/** Enter / change the FPL team ID. Persists to settings. */
export function TeamIdForm({
  onSaved,
  showDemo = true,
  submitLabel = 'Load my team',
  className,
}: TeamIdFormProps) {
  const { settings, update } = useSettings();
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teamId: settings.teamId ? String(settings.teamId) : '' },
  });

  const save = (teamId: number) => {
    update({ teamId });
    onSaved?.(teamId);
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => save(Number(v.teamId)))}
      className={cn('flex w-full max-w-md flex-col gap-2', className)}
    >
      <label htmlFor={inputId} className="text-sm font-semibold">
        FPL team ID
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 8350133"
          invalid={Boolean(errors.teamId)}
          aria-describedby={errors.teamId ? `${errorId} ${helpId}` : helpId}
          {...register('teamId')}
        />
        <Button type="submit">{submitLabel}</Button>
      </div>
      {errors.teamId ? (
        <p id={errorId} role="alert" className="text-negative text-xs font-medium">
          {errors.teamId.message}
        </p>
      ) : null}
      <p id={helpId} className="text-muted text-xs">
        It&apos;s the number in your FPL points-page URL: fantasy.premierleague.com/entry/
        <strong>1234567</strong>/event/…
      </p>
      {showDemo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => save(DEMO_TEAM_ID)}
        >
          Or try a demo team
        </Button>
      ) : null}
    </form>
  );
}
