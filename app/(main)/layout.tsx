type MainLayoutProps = Readonly<{
	children: React.ReactNode;
}>;

export default function MainLayout({ children }: MainLayoutProps) {
	return <div className="min-h-full flex-1">{children}</div>;
}
