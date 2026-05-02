import { Switch, Route } from "wouter";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import Landing from "@/pages/public/landing";
import PublicShiftBoard from "@/pages/public/shifts";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";

// Locum Pages
import LocumDashboard from "@/pages/locum/dashboard";
import LocumShifts from "@/pages/locum/shifts";
import LocumShiftDetail from "@/pages/locum/shifts/[id]";
import LocumApplications from "@/pages/locum/applications";
import LocumBookings from "@/pages/locum/bookings";
import LocumBookingDetail from "@/pages/locum/bookings/[id]";
import LocumEarnings from "@/pages/locum/earnings";
import LocumCalendar from "@/pages/locum/calendar";
import LocumProfile from "@/pages/locum/profile";
import LocumNotifications from "@/pages/locum/notifications";
import LocumRatings from "@/pages/locum/ratings";
import LocumDocuments from "@/pages/locum/documents";
import LocumContract from "@/pages/locum/contract";
import LocumMatchedShifts from "@/pages/locum/matched-shifts";
import ClinicMatchedLocums from "@/pages/clinic/matched-locums";

// Clinic Pages
import ClinicApplications from "@/pages/clinic/applications";
import ClinicLocumProfile from "@/pages/clinic/locums/[id]";
import ClinicDashboard from "@/pages/clinic/dashboard";
import ClinicShifts from "@/pages/clinic/shifts";
import ClinicPostShift from "@/pages/clinic/shifts/new";
import ClinicShiftDetail from "@/pages/clinic/shifts/[id]";
import ClinicBookings from "@/pages/clinic/bookings";
import ClinicBookingDetail from "@/pages/clinic/bookings/[id]";
import ClinicAnalytics from "@/pages/clinic/analytics";
import ClinicProfile from "@/pages/clinic/profile";
import ClinicLocumsDirectory from "@/pages/clinic/locums";
import ClinicTemplates from "@/pages/clinic/templates";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminVerification from "@/pages/admin/verification";
import AdminDisputes from "@/pages/admin/disputes";
import AdminUsers from "@/pages/admin/users";

import NotFound from "@/pages/not-found";

export default function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/shifts" component={PublicShiftBoard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Locum Routes */}
      <Route path="/locum/dashboard">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumDashboard /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/shifts">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumShifts /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/shifts/:id">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumShiftDetail /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/applications">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumApplications /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/bookings">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumBookings /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/bookings/:id">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumBookingDetail /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/earnings">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumEarnings /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/calendar">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumCalendar /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/profile">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumProfile /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/notifications">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumNotifications /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/ratings">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumRatings /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/documents">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumDocuments /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/bookings/:id/contract">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumContract /></Layout></ProtectedRoute>}</Route>
      <Route path="/locum/matched-shifts">{() => <ProtectedRoute allowedRoles={["locum"]}><Layout><LocumMatchedShifts /></Layout></ProtectedRoute>}</Route>

      {/* Clinic Routes */}
      <Route path="/clinic/dashboard">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicDashboard /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/shifts">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicShifts /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/shifts/new">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicPostShift /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/shifts/:id">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicShiftDetail /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/bookings">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicBookings /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/bookings/:id">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicBookingDetail /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/analytics">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicAnalytics /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/profile">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicProfile /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/locums">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicLocumsDirectory /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/shifts/:id/matched">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicMatchedLocums /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/applications">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicApplications /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/locums/:id">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicLocumProfile /></Layout></ProtectedRoute>}</Route>
      <Route path="/clinic/templates">{() => <ProtectedRoute allowedRoles={["clinic_admin", "clinic_hr"]}><Layout><ClinicTemplates /></Layout></ProtectedRoute>}</Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">{() => <ProtectedRoute allowedRoles={["platform_admin"]}><Layout><AdminDashboard /></Layout></ProtectedRoute>}</Route>
      <Route path="/admin/verification">{() => <ProtectedRoute allowedRoles={["platform_admin"]}><Layout><AdminVerification /></Layout></ProtectedRoute>}</Route>
      <Route path="/admin/disputes">{() => <ProtectedRoute allowedRoles={["platform_admin"]}><Layout><AdminDisputes /></Layout></ProtectedRoute>}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute allowedRoles={["platform_admin"]}><Layout><AdminUsers /></Layout></ProtectedRoute>}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}