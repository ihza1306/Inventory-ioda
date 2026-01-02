import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { NotificationProvider } from './components/NotificationProvider'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <NotificationProvider>
                        <App />
                    </NotificationProvider>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    </React.StrictMode>,
)

