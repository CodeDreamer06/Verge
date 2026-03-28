# Verge - AI-Driven Traffic Monitoring Dashboard

Verge is a high-fidelity, comprehensive web application designed for real-time traffic monitoring, incident management, parking tracking, and environmental analytics. Built with modern web technologies, it offers a stunning dark-themed interface equipped with dynamic visualizations and live data integrations.

## Architecture & Technology Stack
- **Frontend Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS & Vanilla CSS (with rich animations and glassmorphism)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## Key Features

### 1. Verge (Live Dashboard)
- **Live Intersections**: View of traffic cameras with AI-generated bounding boxes for vehicle classification (cars, buses, trucks, pedestrians).
- **Queue Length & Forecasting**: Continuous estimation of queue lengths and AI-driven congestion predictions.
- **Traffic Rule Monitoring**: Automated logging of red-light jumpers, speeding, and other common violations.

### 2. Incident Management
- **Active Incident Tracking**: Real-time logging of accidents, vehicle breakdowns, and emergency requests.
- **Signal Preemption**: Automated overrides of traffic lights to quickly clear paths for emergency vehicles.

### 3. Parking Management
- **Spot Watches**: Real-time grid interface showing available, occupied, and overstay parking spots.
- **Automated Alerts**: Active tracking of overstay violations to help manage urban parking infrastructure effectively.

### 4. Advanced Analytics & Environment Insights
- **Traffic Volume Trends**: Interactive daily, weekly, and monthly histograms summarizing vehicle counts.
- **Environmental Impact**: 
  - Monitoring of the Air Quality Index (AQI) in heavy traffic zones.
  - Dynamic estimation of carbon emissions offset and produced based on traffic congestion levels.

### 5. Automated Reporting
- Filterable grids and automated exports for generating comprehensive reports covering congestion efficiency, violation spikes, and historical operations.

## Setup & Running Locally

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **View the Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the live system.

## Project Structure
- `frontend/app`: Next.js application routes (Includes Landing page and Dashboard).
- `frontend/components/tabs`: Contains the major feature pillars making up the dashboard (`VergeTab.tsx`, `StatsTab.tsx`, `ParkingTab.tsx`, `IncidentsTab.tsx`, `ReportsTab.tsx`, `SettingsTab.tsx`).
- `frontend/lib`: Core statistics, shared mock data arrays, and domain configurations.

## UI/UX Engineering
Verge is committed to an exceptional visual presentation:
- **Glassmorphism**: Soft background blurs behind solid borders to enforce a premium, dynamic feel.
- **Micro-interactions**: Spring-based layout animations, hovering tooltips, and live-pulsing nodes mirroring physical world data.
- **Typography & Dark Mode**: Focused and curated aesthetic using crisp spacing and vibrant accent charts.
