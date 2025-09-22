# PGA Golf Coach Platform

## Overview

This is a marketplace platform connecting golfers with PGA certified instructors, similar to Airbnb but for golf lessons. The platform allows students to search for coaches based on location, read profiles and reviews, and book lessons directly. Coaches can register profiles showcasing their expertise, certifications, and teaching tools.

The application features a modern React frontend with a Node.js/Express backend, using PostgreSQL with Drizzle ORM for data persistence. The design follows a mobile-first approach inspired by Airbnb's marketplace patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI patterns
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL as the database
- **Authentication**: Express sessions with bcrypt for password hashing
- **API Design**: RESTful API architecture with JSON responses

### Database Schema Design
The system uses a multi-table approach to separate concerns:
- **Users table**: Base authentication for both students and coaches
- **Students/Coaches tables**: Role-specific profile information
- **Bookings table**: Lesson scheduling and management
- **Reviews table**: Rating and feedback system
- **Supporting tables**: Coach specialties, tools, certifications, and videos

### Component Architecture
- **Modular Components**: Reusable UI components following atomic design principles
- **Modal System**: Centralized modal management for auth, booking, and profile viewing
- **Search & Filter System**: Advanced filtering capabilities for coach discovery
- **Card-based Layout**: Coach profiles displayed in responsive card grids

### Authentication System
- Session-based authentication with secure password hashing
- Role-based access control (student vs coach)
- Registration flow with email validation

### File Structure
- **`client/`**: Frontend React application with component-based architecture
- **`server/`**: Backend API routes and business logic
- **`shared/`**: Common TypeScript types and database schema
- **Component organization**: UI components, examples, and reusable elements

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL database provider
- **Connection**: Uses connection pooling with `@neondatabase/serverless`

### UI and Styling
- **Radix UI**: Headless UI primitives for accessible components
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library built on Radix UI

### Third-party Services
- **SendGrid**: Email delivery service for notifications
- **Stripe**: Payment processing for lesson bookings (configured but not fully implemented)
- **Google Fonts**: Web fonts (Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono)

### Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle Kit**: Database migration and schema management tools

### Form and Validation
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schema validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### State Management
- **TanStack Query**: Server state management with caching
- **React Context**: Local component state management

The platform is designed to be easily deployable on Replit with automatic database provisioning and environment variable management.