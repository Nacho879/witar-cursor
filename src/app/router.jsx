import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Protected from './Protected';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/auth/Login';
import RegisterOwner from '@/pages/auth/RegisterOwner';
import AcceptInvitation from '@/pages/auth/AcceptInvitation';

import OwnerLayout from '@/components/layout/OwnerLayout';
import OwnerDashboard from '@/pages/owner/Dashboard';
import OwnerEmployees from '@/pages/owner/Employees';
import OwnerDepartments from '@/pages/owner/Departments';
import OwnerTimeEntries from '@/pages/owner/TimeEntries';
import OwnerRequests from '@/pages/owner/Requests';
import OwnerSettings from '@/pages/owner/Settings';
import OwnerBilling from '@/pages/owner/Billing';

import ManagerLayout from '@/components/layout/ManagerLayout';
import ManagerDashboard from '@/pages/manager/Dashboard';
import ManagerTeam from '@/pages/manager/Team';
import ManagerTimeEntries from '@/pages/manager/TimeEntries';
import ManagerRequests from '@/pages/manager/Requests';

import EmployeeLayout from '@/components/layout/EmployeeLayout';
import EmployeeDashboard from '@/pages/employee/Dashboard';
import MyTimeEntries from '@/pages/employee/MyTimeEntries';
import MyRequests from '@/pages/employee/MyRequests';
import MyDocuments from '@/pages/employee/MyDocuments';

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <RegisterOwner /> },
  { path: "/accept-invitation", element: <AcceptInvitation /> },

  { path: "/owner", element: <Protected roles={['owner']}><OwnerLayout><OwnerDashboard/></OwnerLayout></Protected> },
  { path: "/owner/employees", element: <Protected roles={['owner','admin']}><OwnerLayout><OwnerEmployees/></OwnerLayout></Protected> },
  { path: "/owner/departments", element: <Protected roles={['owner','admin']}><OwnerLayout><OwnerDepartments/></OwnerLayout></Protected> },
  { path: "/owner/time-entries", element: <Protected roles={['owner','admin']}><OwnerLayout><OwnerTimeEntries/></OwnerLayout></Protected> },
  { path: "/owner/requests", element: <Protected roles={['owner','admin']}><OwnerLayout><OwnerRequests/></OwnerLayout></Protected> },
  { path: "/owner/settings", element: <Protected roles={['owner']}><OwnerLayout><OwnerSettings/></OwnerLayout></Protected> },
  { path: "/owner/billing", element: <Protected roles={['owner']}><OwnerLayout><OwnerBilling/></OwnerLayout></Protected> },

  { path: "/manager", element: <Protected roles={['manager']}><ManagerLayout><ManagerDashboard/></ManagerLayout></Protected> },
  { path: "/manager/team", element: <Protected roles={['manager']}><ManagerLayout><ManagerTeam/></ManagerLayout></Protected> },
  { path: "/manager/time-entries", element: <Protected roles={['manager']}><ManagerLayout><ManagerTimeEntries/></ManagerLayout></Protected> },
  { path: "/manager/requests", element: <Protected roles={['manager']}><ManagerLayout><ManagerRequests/></ManagerLayout></Protected> },

  { path: "/employee", element: <Protected roles={['employee']}><EmployeeLayout><EmployeeDashboard/></EmployeeLayout></Protected> },
  { path: "/employee/my-time-entries", element: <Protected roles={['employee']}><EmployeeLayout><MyTimeEntries/></EmployeeLayout></Protected> },
  { path: "/employee/my-requests", element: <Protected roles={['employee']}><EmployeeLayout><MyRequests/></EmployeeLayout></Protected> },
  { path: "/employee/my-documents", element: <Protected roles={['employee']}><EmployeeLayout><MyDocuments/></EmployeeLayout></Protected> },
]);

export default function AppRouter(){ return <RouterProvider router={router} />; }
