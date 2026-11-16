import SessionSummary from '@/components/SessionSummary'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SessionSummary id={id} />
}
