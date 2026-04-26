export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* MAIN ECOMMERCE NAVBAR */}


            {/* PAGE CONTENT */}
            <main className="min-h-screen">
                {children}
            </main>

        </>
    );
}