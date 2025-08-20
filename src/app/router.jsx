import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Protected from './Protected';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/auth/Login';
import RegisterOwner from '@/pages/auth/RegisterOwner';
import Welcome from '@/pages/auth/Welcome';
import AcceptInvitation from '@/pages/auth/AcceptInvitation';
import ChangePassword from '@/pages/auth/ChangePassword';

import OwnerLayout from '@/components/layout/OwnerLayout';
import OwnerDashboard from '@/pages/owner/Dashboard';
import CompanyDashboard from '@/pages/owner/CompanyDashboard';
import OwnerEmployees from '@/pages/owner/Employees';
import OwnerInvitations from '@/pages/owner/Invitations';
import OwnerDepartments from '@/pages/owner/Departments';
import OwnerTimeEntries from '@/pages/owner/TimeEntries';
import OwnerRequests from '@/pages/owner/Requests';
import OwnerSettings from '@/pages/owner/Settings';
import OwnerBilling from '@/pages/owner/Billing';
import OwnerReports from '@/pages/owner/Reports';

import AdminLayout from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminProfile from '@/pages/admin/Profile';
import AdminMyDocuments from '@/pages/admin/MyDocuments';
import AdminTimeEntries from '@/pages/admin/TimeEntries';

import ManagerLayout from '@/components/layout/ManagerLayout';
import ManagerDashboard from '@/pages/manager/Dashboard';
import ManagerTeam from '@/pages/manager/Team';
import ManagerTimeEntries from '@/pages/manager/TimeEntries';
import ManagerRequests from '@/pages/manager/Requests';
import ManagerProfile from '@/pages/manager/Profile';
import ManagerTimeEntryEditRequests from '@/pages/manager/TimeEntryEditRequests';
import DocumentsManagement from '@/pages/manager/DocumentsManagement';

import EmployeeLayout from '@/components/layout/EmployeeLayout';
import EmployeeDashboard from '@/pages/employee/Dashboard';
import MyTimeEntries from '@/pages/employee/MyTimeEntries';
import MyRequests from '@/pages/employee/MyRequests';
import MyDocuments from '@/pages/employee/MyDocuments';
import EmployeeProfile from '@/pages/employee/Profile';

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <RegisterOwner /> },
  { path: "/welcome", element: <Welcome /> },
  { path: "/accept-invitation", element: <AcceptInvitation /> },
  { path: "/change-password", element: <ChangePassword /> },

  // Owner routes (solo owner)
  { path: "/owner", element: <Protected roles={['owner']}><OwnerLayout><OwnerDashboard/></OwnerLayout></Protected> },
  { path: "/owner/company", element: <Protected roles={['owner']}><OwnerLayout><CompanyDashboard/></OwnerLayout></Protected> },
  { path: "/owner/employees", element: <Protected roles={['owner']}><OwnerLayout><OwnerEmployees/></OwnerLayout></Protected> },
  { path: "/owner/invitations", element: <Protected roles={['owner']}><OwnerLayout><OwnerInvitations/></OwnerLayout></Protected> },
  { path: "/owner/departments", element: <Protected roles={['owner']}><OwnerLayout><OwnerDepartments/></OwnerLayout></Protected> },
  { path: "/owner/time-entries", element: <Protected roles={['owner']}><OwnerLayout><OwnerTimeEntries/></OwnerLayout></Protected> },
  { path: "/owner/requests", element: <Protected roles={['owner']}><OwnerLayout><OwnerRequests/></OwnerLayout></Protected> },
  { path: "/owner/settings", element: <Protected roles={['owner']}><OwnerLayout><OwnerSettings/></OwnerLayout></Protected> },
  { path: "/owner/billing", element: <Protected roles={['owner']}><OwnerLayout><OwnerBilling/></OwnerLayout></Protected> },
  { path: "/owner/reports", element: <Protected roles={['owner']}><OwnerLayout><OwnerReports/></OwnerLayout></Protected> },

  // Admin routes (solo admin)
  { path: "/admin", element: <Protected roles={['admin']}><AdminLayout><AdminDashboard/></AdminLayout></Protected> },
  { path: "/admin/company", element: <Protected roles={['admin']}><AdminLayout><CompanyDashboard/></AdminLayout></Protected> },
  { path: "/admin/employees", element: <Protected roles={['admin']}><AdminLayout><OwnerEmployees/></AdminLayout></Protected> },
  { path: "/admin/invitations", element: <Protected roles={['admin']}><AdminLayout><OwnerInvitations/></AdminLayout></Protected> },
  { path: "/admin/departments", element: <Protected roles={['admin']}><AdminLayout><OwnerDepartments/></AdminLayout></Protected> },
  { path: "/admin/time-entries", element: <Protected roles={['admin']}><AdminLayout><AdminTimeEntries/></AdminLayout></Protected> },
  { path: "/admin/requests", element: <Protected roles={['admin']}><AdminLayout><OwnerRequests/></AdminLayout></Protected> },
  { path: "/admin/reports", element: <Protected roles={['admin']}><AdminLayout><OwnerReports/></AdminLayout></Protected> },
  { path: "/admin/profile", element: <Protected roles={['admin']}><AdminLayout><AdminProfile/></AdminLayout></Protected> },
  // Rutas personales del admin
  { path: "/admin/my-time-entries", element: <Protected roles={['admin']}><AdminLayout><MyTimeEntries/></AdminLayout></Protected> },
  { path: "/admin/my-requests", element: <Protected roles={['admin']}><AdminLayout><MyRequests/></AdminLayout></Protected> },
  { path: "/admin/my-documents", element: <Protected roles={['admin']}><AdminLayout><AdminMyDocuments/></AdminLayout></Protected> },

  // Manager routes
  { path: "/manager", element: <Protected roles={['manager']}><ManagerLayout><ManagerDashboard/></ManagerLayout></Protected> },
  { path: "/manager/team", element: <Protected roles={['manager']}><ManagerLayout><ManagerTeam/></ManagerLayout></Protected> },
  { path: "/manager/time-entries", element: <Protected roles={['manager']}><ManagerLayout><ManagerTimeEntries/></ManagerLayout></Protected> },
  { path: "/manager/requests", element: <Protected roles={['manager']}><ManagerLayout><ManagerRequests/></ManagerLayout></Protected> },
  { path: "/manager/time-entry-edit-requests", element: <Protected roles={['manager']}><ManagerLayout><ManagerTimeEntryEditRequests/></ManagerLayout></Protected> },
  { path: "/manager/profile", element: <Protected roles={['manager']}><ManagerLayout><ManagerProfile/></ManagerLayout></Protected> },
  { path: "/manager/documents-management", element: <Protected roles={['manager']}><ManagerLayout><DocumentsManagement/></ManagerLayout></Protected> },
  // Rutas personales del manager
  { path: "/manager/my-time-entries", element: <Protected roles={['manager']}><ManagerLayout><MyTimeEntries/></ManagerLayout></Protected> },
  { path: "/manager/my-requests", element: <Protected roles={['manager']}><ManagerLayout><MyRequests/></ManagerLayout></Protected> },
  { path: "/manager/documents", element: <Protected roles={['manager']}><ManagerLayout><MyDocuments/></ManagerLayout></Protected> },

  // Employee routes
  { path: "/employee", element: <Protected roles={['employee']}><EmployeeLayout><EmployeeDashboard/></EmployeeLayout></Protected> },
  { path: "/employee/my-time-entries", element: <Protected roles={['employee']}><EmployeeLayout><MyTimeEntries/></EmployeeLayout></Protected> },
  { path: "/employee/my-requests", element: <Protected roles={['employee']}><EmployeeLayout><MyRequests/></EmployeeLayout></Protected> },
  { path: "/employee/my-documents", element: <Protected roles={['employee']}><EmployeeLayout><MyDocuments/></EmployeeLayout></Protected> },
  { path: "/employee/profile", element: <Protected roles={['employee']}><EmployeeLayout><EmployeeProfile/></EmployeeLayout></Protected> },

  // Fallback 404
  { path: "*", element: <div style={{ padding: 24 }}><h1>404 - Página no encontrada</h1><p>La ruta solicitada no existe.</p></div> }
], {
  future: {
    v7_startTransition: true
  }
});

export default function AppRouter(){ return <RouterProvider router={router} />; }
