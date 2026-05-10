type PatientAppointmentsPageProps = Readonly<{
  params: Promise<{ patientId: string }>;
}>;

export default async function PatientAppointmentsPage({
  params,
}: PatientAppointmentsPageProps) {
  const { patientId } = await params;

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Rendez-vous</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Liste des rendez-vous pour le patient {patientId}.
      </p>
    </main>
  );
}
