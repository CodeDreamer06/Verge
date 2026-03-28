import {
  AlertTriangle,
  Camera,
  ShieldAlert,
  Siren,
  Car,
  Video,
  Zap,
} from "lucide-react";

export const ALERTS = [
  {
    id: 1,
    type: "Emergency",
    title: "Ambulance approaching Intersect 42",
    time: "Just now",
    icon: Siren,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: 2,
    type: "Violation",
    title: "Red Light Jump - Cam 12",
    time: "2m ago",
    icon: Camera,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: 3,
    type: "Warning",
    title: "High Congestion Predicted - Main St.",
    time: "5m ago",
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    id: 4,
    type: "Violation",
    title: "No Helmet Detected - Cam 04",
    time: "12m ago",
    icon: ShieldAlert,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

export const VIOLATIONS = [
  {
    id: "V-8291",
    type: "Red Light Jump",
    vehicle: "TS 09 EP 1234",
    location: "Junction 7",
    time: "10:42 AM",
    status: "Logged",
  },
  {
    id: "V-8292",
    type: "No Helmet",
    vehicle: "TS 07 BP 9012",
    location: "Jubilee Hills Checkpost",
    time: "10:38 AM",
    status: "Alert Sent",
  },
  {
    id: "V-8293",
    type: "Over-speeding",
    vehicle: "TS 08 XY 5566",
    location: "Highway Link",
    time: "10:15 AM",
    status: "Logged",
  },
  {
    id: "V-8294",
    type: "Wrong Way",
    vehicle: "Unknown",
    location: "Sector 4",
    time: "09:50 AM",
    status: "Manual Review",
  },
];
