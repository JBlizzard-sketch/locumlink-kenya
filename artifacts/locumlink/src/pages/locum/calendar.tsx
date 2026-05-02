import { useState } from "react";
import { useGetLocumAvailability, useSetLocumAvailability } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LocumCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const { data: availability, isLoading, refetch } = useGetLocumAvailability({});
  const setAvailability = useSetLocumAvailability();
  const { toast } = useToast();

  const handleToggleDay = async (selectedDate: Date) => {
    if (!selectedDate) return;
    
    // Check if currently available
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const isCurrentlyAvailable = availability?.data?.some(
      slot => slot.date.startsWith(dateStr) && slot.isAvailable
    );

    try {
      await setAvailability.mutateAsync({
        data: {
          slots: [{
            date: dateStr,
            isAvailable: !isCurrentlyAvailable
          }]
        }
      });
      await refetch();
      toast({ 
        title: !isCurrentlyAvailable ? "Marked as available" : "Marked as unavailable",
        description: format(selectedDate, 'MMM dd, yyyy')
      });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const availableDates = availability?.data
    ?.filter(slot => slot.isAvailable)
    ?.map(slot => new Date(slot.date)) || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Availability Calendar</h1>
        <p className="text-muted-foreground mt-1">Set the days you are available to work shifts.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Days</CardTitle>
            <CardDescription>Click a day to toggle your availability</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  if (d) handleToggleDay(d);
                }}
                modifiers={{
                  available: availableDates,
                }}
                modifiersStyles={{
                  available: { 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'white',
                    fontWeight: 'bold' 
                  }
                }}
                className="rounded-md border shadow-sm p-4"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Settings</CardTitle>
            <CardDescription>Set repeating availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-2">Available Every Weekend</h4>
              <p className="text-sm text-muted-foreground mb-4">Mark all Saturdays and Sundays as available for the next month.</p>
              <Button variant="outline" className="w-full">Set Weekend Availability</Button>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-2">Clear Schedule</h4>
              <p className="text-sm text-muted-foreground mb-4">Mark all days as unavailable.</p>
              <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10">Clear All Availability</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}