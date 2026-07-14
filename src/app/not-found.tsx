import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <FileQuestion className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-5xl font-bold text-muted-foreground/30">404</p>
              <CardTitle className="text-xl mt-2">Page not found</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
