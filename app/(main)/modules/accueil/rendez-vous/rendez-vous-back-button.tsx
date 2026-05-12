'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type RendezVousBackButtonProps = Readonly<{
	variant?: 'default' | 'icon';
	className?: string;
}>;

export function RendezVousBackButton({
	variant = 'default',
	className,
}: RendezVousBackButtonProps) {
	const router = useRouter();

	if (variant === 'icon') {
		return (
			<button
				type="button"
				onClick={() => router.back()}
				aria-label="Retour"
				className={cn(
					'rounded-xl p-2.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
					className,
				)}
			>
				<ArrowLeft className="h-5 w-5" />
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={() => router.back()}
			className={cn(
				'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50',
				className,
			)}
		>
			<ArrowLeft size={16} className="text-gray-500" />
			Retour
		</button>
	);
}
