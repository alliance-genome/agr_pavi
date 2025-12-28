'use client';

import React, { useState, useEffect } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import styles from './admin.module.css';

import { HealthStatus } from './components/HealthStatus';
import { StepFunctionsMonitor } from './components/StepFunctionsMonitor';
import { BatchJobMonitor } from './components/BatchJobMonitor';
import { ApiTester } from './components/ApiTester';
import { JobSubmissionTester } from './components/JobSubmissionTester';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'pavi-admin-2024';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if already authenticated in session
        const authToken = sessionStorage.getItem('pavi_admin_auth');
        if (authToken === 'authenticated') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = () => {
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('pavi_admin_auth', 'authenticated');
            setError('');
        } else {
            setError('Invalid password');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('pavi_admin_auth');
        setPassword('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className={styles.loginContainer}>
                <Card className={styles.loginCard}>
                    <div className={styles.loginHeader}>
                        <i className="pi pi-lock" style={{ fontSize: '2rem', color: 'var(--agr-primary)' }} />
                        <h1>PAVI Admin Dashboard</h1>
                        <p>Enter the admin password to access the dashboard</p>
                    </div>
                    <div className={styles.loginForm}>
                        <Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter admin password"
                            feedback={false}
                            toggleMask
                            className={styles.passwordInput}
                        />
                        {error && <p className={styles.error}>{error}</p>}
                        <Button
                            label="Login"
                            icon="pi pi-sign-in"
                            onClick={handleLogin}
                            className="p-button-lg"
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.adminContainer}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>PAVI Admin Dashboard</h1>
                    <p>Monitor and test your PAVI deployment</p>
                </div>
                <Button
                    label="Logout"
                    icon="pi pi-sign-out"
                    className="p-button-outlined p-button-secondary"
                    onClick={handleLogout}
                />
            </header>

            <main className={styles.main}>
                <TabView>
                    <TabPanel header="Health Status" leftIcon="pi pi-heart mr-2">
                        <HealthStatus />
                    </TabPanel>
                    <TabPanel header="Step Functions" leftIcon="pi pi-sitemap mr-2">
                        <StepFunctionsMonitor />
                    </TabPanel>
                    <TabPanel header="Batch Jobs" leftIcon="pi pi-server mr-2">
                        <BatchJobMonitor />
                    </TabPanel>
                    <TabPanel header="API Testing" leftIcon="pi pi-code mr-2">
                        <ApiTester />
                    </TabPanel>
                    <TabPanel header="E2E Testing" leftIcon="pi pi-play mr-2">
                        <JobSubmissionTester />
                    </TabPanel>
                </TabView>
            </main>
        </div>
    );
}
