import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import CanvasRoom from '../pages/CanvasRoom.jsx';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/room/:roomId" element={<CanvasRoom />} />
      </Routes>
    </BrowserRouter>
  );
}
