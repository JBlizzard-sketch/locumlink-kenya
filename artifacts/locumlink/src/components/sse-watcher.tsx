import { useSSE, type SseEventType } from "@/hooks/use-sse";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const EVENT_MESSAGES: Record<SseEventType, (payload: Record<string, unknown>) => { title: string; description: string }> = {
  application_received: (p) => ({
    title: "New Application",
    description: `${p.locumName ?? "A locum"} applied for "${p.shiftTitle ?? "your shift"}"`,
  }),
  application_shortlisted: (p) => ({
    title: "You've Been Shortlisted",
    description: `You're shortlisted for "${p.shiftTitle ?? "a shift"}" — contract coming soon.`,
  }),
  application_confirmed: (p) => ({
    title: "Booking Confirmed!",
    description: `Your booking for "${p.shiftTitle ?? "a shift"}" is confirmed. Sign the contract now.`,
  }),
  application_rejected: (p) => ({
    title: "Application Not Selected",
    description: `Your application for "${p.shiftTitle ?? "a shift"}" was not selected.`,
  }),
  application_withdrawn: (p) => ({
    title: "Applicant Withdrew",
    description: `${p.locumName ?? "A locum"} withdrew their application for "${p.shiftTitle ?? "your shift"}".`,
  }),
  booking_updated: () => ({
    title: "Booking Updated",
    description: "Your booking details have changed.",
  }),
  payment_released: (p) => ({
    title: "Payment Released 💸",
    description: `KES ${Number(p.amount ?? 0).toLocaleString()} has been sent to your M-Pesa.`,
  }),
  dispute_opened: () => ({
    title: "Dispute Raised",
    description: "A dispute has been opened on one of your bookings.",
  }),
  dispute_resolved: (p) => ({
    title: "Dispute Resolved",
    description: `Your dispute has been resolved: ${p.status ?? "closed"}.`,
  }),
  credential_verified: () => ({
    title: "Credentials Verified ✓",
    description: "Your credentials have been approved.",
  }),
  credential_rejected: () => ({
    title: "Credentials Require Attention",
    description: "Your credential submission was not approved. Please check your notifications.",
  }),
  shift_reminder: (p) => ({
    title: "Shift Reminder",
    description: `Your shift "${p.shiftTitle ?? ""}" starts soon. Don't forget to check in.`,
  }),
  shift_cancelled: (p) => ({
    title: "Shift Cancelled",
    description: `The shift "${p.shiftTitle ?? ""}" has been cancelled by the clinic.`,
  }),
  ping: () => ({ title: "", description: "" }),
};

const QUERY_KEYS_TO_INVALIDATE: Partial<Record<SseEventType, string[][]>> = {
  application_received:    [["listMyShiftsApplications"], ["listApplications"], ["listNotifications"]],
  application_shortlisted: [["listMyApplications"], ["listNotifications"]],
  application_confirmed:   [["listMyApplications"], ["listMyBookings"], ["listBookings"], ["listNotifications"]],
  application_rejected:    [["listMyApplications"], ["listNotifications"]],
  application_withdrawn:   [["listMyShiftsApplications"], ["listApplications"], ["listNotifications"]],
  booking_updated:         [["listMyBookings"], ["listBookings"]],
  payment_released:        [["listMyPayments"], ["getLocumAnalytics"], ["listNotifications"]],
  dispute_resolved:        [["listMyDisputes"], ["listNotifications"]],
  credential_verified:     [["getMyLocum"], ["getMyClinic"], ["listNotifications"]],
  credential_rejected:     [["getMyLocum"], ["getMyClinic"], ["listNotifications"]],
  shift_cancelled:         [["listMyApplications"], ["listMyBookings"], ["listNotifications"]],
};

export function SseWatcher() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useSSE((type, payload) => {
    if (type === "ping") return;

    const messages = EVENT_MESSAGES[type];
    if (messages) {
      const { title, description } = messages(payload);
      if (title) {
        toast({ title, description });
      }
    }

    // Invalidate relevant queries so UI refreshes automatically
    const keys = QUERY_KEYS_TO_INVALIDATE[type];
    if (keys) {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    }
  });

  return null;
}
