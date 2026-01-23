import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React, { useState, useCallback } from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
				secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
			},
				size: {
					default: 'h-11 px-5 py-3',
					sm: 'h-10 rounded-md px-4',
					lg: 'h-12 rounded-md px-9',
					icon: 'h-11 w-11',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			onClick,
			disabled,
			lockOnClick = true,
			lockDuration = 600,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : 'button';
		const [busy, setBusy] = useState(false);

		const handleClick = useCallback(
			(event) => {
				if (busy || disabled) return;
				if (!onClick) return;

				// Evita múltiples disparos; libera después de la promesa o un breve timeout.
				setBusy(true);
				try {
					const result = onClick(event);
					if (lockOnClick && result?.then) {
						result.finally(() => setBusy(false));
						return result;
					}
				} catch (err) {
					setBusy(false);
					throw err;
				}

				if (!lockOnClick) {
					setBusy(false);
				} else {
					setTimeout(() => setBusy(false), lockDuration);
				}
			},
			[busy, disabled, lockOnClick, lockDuration, onClick],
		);

		return (
			<Comp
				className={cn(
					buttonVariants({ variant, size, className }),
					busy ? 'cursor-wait' : '',
				)}
				ref={ref}
				onClick={handleClick}
				disabled={disabled || (lockOnClick && busy)}
				data-busy={busy ? 'true' : 'false'}
				{...props}
			/>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
