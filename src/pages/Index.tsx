import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to AI Music Platform</h1>
        <p className="text-xl text-muted-foreground">Signed in as: {user.email}</p>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Index;