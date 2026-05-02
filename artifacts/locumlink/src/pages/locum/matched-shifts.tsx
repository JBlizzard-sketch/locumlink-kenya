import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LocumMatchedShifts() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/locum/shifts?tab=recommended", { replace: true });
  }, [setLocation]);
  return null;
}
