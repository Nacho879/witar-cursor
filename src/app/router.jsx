import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Protected from './Protected';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/auth/Login';
import RegisterOwner from '@/pages/auth/RegisterOwner';
import Welcome from '@/pages/auth/Welcome';
import AcceptInvitation from '@/pages/auth/AcceptInvitation';
import ChangePassword from '@/pages/auth/ChangePassword';
import Demo from '@/pages/Demo';
import TerminosCondiciones from '@/pages/legal/TerminosCondiciones';
import PoliticaPrivacidad from '@/pages/legal/PoliticaPrivacidad';
import PoliticaCookies from '@/pages/legal/PoliticaCookies';

// Lazy load layouts
const OwnerLayout = React.lazy(() => import('@/components/layout/OwnerLayout'));
const AdminLayout = React.lazy(() => import('@/components/layout/AdminLayout'));
const ManagerLayout = React.lazy(() => import('@/components/layout/ManagerLayout'));
const EmployeeLayout = React.lazy(() => import('@/components/layout/EmployeeLayout'));

// Lazy load owner pages
const OwnerDashboard = React.lazy(() => import('@/pages/owner/Dashboard'));
const CompanyDashboard = React.lazy(() => import('@/pages/owner/CompanyDashboard'));
const OwnerEmployees = React.lazy(() => import('@/pages/owner/Employees'));
const OwnerInvitations = React.lazy(() => import('@/pages/owner/Invitations'));
const OwnerDepartments = React.lazy(() => import('@/pages/owner/Departments'));
const OwnerTimeEntries = React.lazy(() => import('@/pages/owner/TimeEntries'));
const OwnerRequests = React.lazy(() => import('@/pages/owner/Requests'));
const OwnerSettings = React.lazy(() => import('@/pages/owner/Settings'));
const OwnerBilling = React.lazy(() => import('@/pages/owner/Billing'));
const OwnerReports = React.lazy(() => import('@/pages/owner/Reports'));

// Lazy load admin pages
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'));
const AdminProfile = React.lazy(() => import('@/pages/admin/Profile'));
const AdminMyDocuments = React.lazy(() => import('@/pages/admin/MyDocuments'));
const AdminTimeEntries = React.lazy(() => import('@/pages/admin/TimeEntries'));

// Lazy load manager pages
const ManagerDashboard = React.lazy(() => import('@/pages/manager/Dashboard'));
const ManagerTeam = React.lazy(() => import('@/pages/manager/Team'));
const ManagerTimeEntries = React.lazy(() => import('@/pages/manager/TimeEntries'));
const ManagerRequests = React.lazy(() => import('@/pages/manager/Requests'));
const ManagerProfile = React.lazy(() => import('@/pages/manager/Profile'));
const ManagerTimeEntryEditRequests = React.lazy(() => import('@/pages/manager/TimeEntryEditRequests'));
const DocumentsManagement = React.lazy(() => import('@/pages/manager/DocumentsManagement'));

// Lazy load employee pages
const EmployeeDashboard = React.lazy(() => import('@/pages/employee/Dashboard'));
const MyTimeEntries = React.lazy(() => import('@/pages/employee/MyTimeEntries'));
const MyRequests = React.lazy(() => import('@/pages/employee/MyRequests'));
const MyDocuments = React.lazy(() => import('@/pages/employee/MyDocuments'));
const EmployeeProfile = React.lazy(() => import('@/pages/employee/Profile'));

// Lazy load shared pages
const Notifications = React.lazy(() => import('@/pages/Notifications'));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/demo", element: <Demo /> },
  { path: "/login", element: <Login /> },
  { path: "/terminos-condiciones", element: <TerminosCondiciones /> },
  { path: "/politica-privacidad", element: <PoliticaPrivacidad /> },
  { path: "/politica-cookies", element: <PoliticaCookies /> },
  { path: "/register", element: <RegisterOwner /> },
  { path: "/welcome", element: <Welcome /> },
  { path: "/accept-invitation", element: <AcceptInvitation /> },
  { path: "/change-password", element: <ChangePassword /> },

  // Owner routes (solo owner)
  { 
    path: "/owner", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerDashboard/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/company", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <CompanyDashboard/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/employees", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerEmployees/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/invitations", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerInvitations/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/departments", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerDepartments/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerTimeEntries/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerRequests/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/settings", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerSettings/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/billing", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerBilling/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/reports", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <OwnerReports/>
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/owner/notifications", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['owner']}>
          <OwnerLayout>
            <Notifications />
          </OwnerLayout>
        </Protected>
      </React.Suspense>
    )
  },

  // Admin routes (solo admin)
  { 
    path: "/admin", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <AdminDashboard/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/company", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <CompanyDashboard/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/employees", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <OwnerEmployees/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/invitations", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <OwnerInvitations/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/departments", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <OwnerDepartments/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <AdminTimeEntries/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <OwnerRequests/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/reports", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <OwnerReports/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/profile", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <AdminProfile/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  // Rutas personales del admin
  { 
    path: "/admin/my-time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <MyTimeEntries/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/my-requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <MyRequests/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/admin/my-documents", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['admin']}>
          <AdminLayout>
            <AdminMyDocuments/>
          </AdminLayout>
        </Protected>
      </React.Suspense>
    )
  },

  // Manager routes
  { 
    path: "/manager", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerDashboard/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/team", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerTeam/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerTimeEntries/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerRequests/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/time-entry-edit-requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerTimeEntryEditRequests/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/profile", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <ManagerProfile/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/documents", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <DocumentsManagement/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  // Rutas personales del manager
  { 
    path: "/manager/my-time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <MyTimeEntries/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/manager/my-requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['manager']}>
          <ManagerLayout>
            <MyRequests/>
          </ManagerLayout>
        </Protected>
      </React.Suspense>
    )
  },

  // Employee routes
  { 
    path: "/employee", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['employee']}>
          <EmployeeLayout>
            <EmployeeDashboard/>
          </EmployeeLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/employee/my-time-entries", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['employee']}>
          <EmployeeLayout>
            <MyTimeEntries/>
          </EmployeeLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/employee/my-requests", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['employee']}>
          <EmployeeLayout>
            <MyRequests/>
          </EmployeeLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/employee/my-documents", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['employee']}>
          <EmployeeLayout>
            <MyDocuments/>
          </EmployeeLayout>
        </Protected>
      </React.Suspense>
    )
  },
  { 
    path: "/employee/profile", 
    element: (
      <React.Suspense fallback={<LoadingFallback />}>
        <Protected roles={['employee']}>
          <EmployeeLayout>
            <EmployeeProfile/>
          </EmployeeLayout>
        </Protected>
      </React.Suspense>
    )
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
