import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthModal } from "@/features/auth/AuthModal"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { useAuth } from "@/features/auth/auth-context"
import { BookingGrid } from "@/features/booking/BookingGrid"
import { UserDashboard } from "@/features/dashboard/UserDashboard"
import { CLUB_NAME } from "@/lib/club"

type Tab = "book" | "bookings"

function Shell() {
  const { user, loading, signOut, recoveringPassword, finishRecovery } = useAuth()
  const [tab, setTab] = useState<Tab>("book")
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xl font-bold tracking-tight">Bandeja</p>
            <p className="text-xs text-muted-foreground">{CLUB_NAME} · court booking</p>
          </div>
          {!loading &&
            (user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut data-icon="inline-start" />
                  Log out
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Log in / Sign up
              </Button>
            ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
          <TabsList>
            <TabsTrigger value="book">Book a court</TabsTrigger>
            <TabsTrigger value="bookings">My bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="book">
            <BookingGrid />
          </TabsContent>

          <TabsContent value="bookings">
            {user ? (
              <UserDashboard onBookCourt={() => setTab("book")} />
            ) : (
              <Card size="sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">Log in to see your upcoming matches.</p>
                  <Button onClick={() => setAuthOpen(true)}>Log in</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <AuthModal
        open={recoveringPassword}
        onOpenChange={(open) => !open && finishRecovery()}
        initialMode="reset"
      />
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
