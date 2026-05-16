"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

type MainLayoutProps = Readonly<{
	children: React.ReactNode;
}>;

export default function MainLayout({ children }: MainLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const handleToggleSidebar = () => {
		setIsSidebarOpen((prev) => !prev);
	};

	const handleCloseSidebar = () => {
		setIsSidebarOpen(false);
	};

	return (
		<div className="flex h-full flex-col bg-[#F8F9FB] overflow-hidden">
			{/* Header */}
			<Header onMenuClick={handleToggleSidebar} />

			<div className="flex flex-1 overflow-hidden min-w-0">
				{/* Fixed Sidebar */}
				<Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />

				{/* Content */}
				<main className="flex-1 overflow-auto overflow-x-hidden bg-[#F8F9FB] min-w-0">
					{children}
				</main>
			</div>
		</div>
	);
}
