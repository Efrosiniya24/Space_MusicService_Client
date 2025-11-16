import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element: Component, ...rest }) => {
    const isAuthenticated = !!localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');

    if (!isAuthenticated) {
        return <Navigate to="/signIn" replace />;
    }

    if (userRole !== requiredRole) {
        return <Navigate to="/signIn" replace />; 
    }

    return children;
};

export default ProtectedRoute;
