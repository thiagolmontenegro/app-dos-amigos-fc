import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppDosAmigosFC from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppDosAmigosFC />
  </React.StrictMode>,
)
