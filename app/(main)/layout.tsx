import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

type MainLayoutProps = Readonly<{
	children: React.ReactNode;
}>;

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<div className="flex h-screen flex-col bg-[#F8F9FB]">
			{/* Header */}
			<Header />

			<div className="flex flex-1 overflow-hidden">
				{/* Fixed Sidebar */}
				<Sidebar />

				{/* Content */}
				<main className="flex-1 overflow-auto bg-[#F8F9FB]">
					{children}
				</main>
			</div>
		</div>
	);
}
