import SettingsClient from '@/components/SettingsClient'
import { getAuthState } from '@/lib/auth'

export default async function SettingsPage() {
  const { user } = await getAuthState()
  return <SettingsClient user={user} />
}
