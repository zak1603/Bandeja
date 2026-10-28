import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { playerName, useAuth } from "@/features/auth/auth-context"
import { BookingGrid } from "@/features/booking/BookingGrid"
import { UserDashboard } from "@/features/dashboard/UserDashboard"
import { CourtHero } from "@/features/padel/CourtRally"
import { PadelBall } from "@/features/padel/PadelBall"
import { CLUB_NAME } from "@/lib/club"

type Tab = "book" | "bookings"

function Shell() {
  const { user, loading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>("book")
  // No accounts or log-in page: a device becomes a guest player on its first
  // booking (GuestDetailsDialog), and "My bookings" only exists after that.
  const activeTab = user ? tab : "book"

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <PadelBall className="padel-bob size-8" />
            <div>
              <p className="text-xl font-bold tracking-tight">Bandeja</p>
              <p className="text-xs text-muted-foreground">{CLUB_NAME} · court booking</p>
            </div>
          </div>
          {!loading && user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                <span className="hidden sm:inline">Playing as </span>
                <span className="font-medium text-foreground">{playerName(user)}</span>
              </span>
              {/* Starts a fresh guest next booking. Bookings stay under the old name. */}
              <Button variant="outline" size="sm" onClick={signOut}>
                Not you?
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <CourtHero className="mb-6" />
        {/* Tabs stay mounted either way so BookingGrid keeps its state when an
            account is created mid-booking; only the tab bar depends on the user. */}
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
          {user && (
            <TabsList>
              <TabsTrigger value="book">Book a court</TabsTrigger>
              <TabsTrigger value="bookings">My bookings</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="book">
            <BookingGrid />
          </TabsContent>

          <TabsContent value="bookings">
            {user && <UserDashboard onBookCourt={() => setTab("book")} />}
          </TabsContent>
        </Tabs>
      </main>

      <Toaster richColors position="top-center" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
