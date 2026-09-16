import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-base font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">Sắp ra mắt</p>
      </CardContent>
    </Card>
  );
}
